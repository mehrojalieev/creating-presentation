import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import './App.scss';

interface Presentation {
  id: number;
  title: string;
  creator: string;
}

interface TextData {
  content: string;
  position: [number, number];
}

// Start the WebSocket
const socket = io('http://localhost:5000');

function App() {
  const [nickname, setNickname] = useState<string>('');
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null);
  const [textData, setTextData] = useState<string>('');
  const [texts, setTexts] = useState<TextData[]>([]); 

  useEffect(() => {
    axios.get('http://localhost:5000/api/presentations')
      .then(response => setPresentations(response.data))
      .catch(error => console.error('Error fetching presentations:', error));
  }, []);

  const createPresentation = async (title: string) => {
    const newPresentation = { title, creator: nickname };
    const response = await axios.post('http://localhost:5000/api/presentations', newPresentation);
    setCurrentPresentation(response.data);
    socket.emit('join-presentation', { presentationId: response.data.id, nickname }); 
  };

  const joinPresentation = (presentationId: number) => {
    socket.emit('join-presentation', { presentationId, nickname });
    const joinedPresentation = presentations.find(p => p.id === presentationId) || null;
    setCurrentPresentation(joinedPresentation);
  };

  const handleAddText = () => {
    if (currentPresentation && textData) {
      const newText = { content: textData, position: [100, 100] };
      socket.emit('add-text', { presentationId: currentPresentation.id, textData: newText });
      setTextData(''); 
    }
  };

  useEffect(() => {
    socket.on('text-added', (textData: TextData) => {
      console.log('Received text data:', textData);
      setTexts((prevTexts) => [...prevTexts, textData]); 
    });

    return () => {
      socket.off('text-added');
    };
  }, []);

  if (!currentPresentation) {
    return (
      <div className="container">
        <h1>Cooperative Presentation</h1>
        <input
          type="text"
          placeholder="Enter your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <button onClick={() => createPresentation('New Presentation')}>Create New Presentation</button>
        <h2>Join an Existing Presentation</h2>
        <div className="presentations-list">
          {presentations.map((presentation) => (
            <div key={presentation.id} className="presentation-card">
              <span>{presentation.title}</span>
              <button onClick={() => joinPresentation(presentation.id)}>Join</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="presentation-container">
      <h1>Presentation: {currentPresentation.title}</h1>
      <input
        type="text"
        placeholder="Add text"
        value={textData}
        onChange={(e) => setTextData(e.target.value)}
        className="text-input"
      />
      <button onClick={handleAddText} className="add-text-button">Add Text</button>

      <div className="presentation-area">
        <p>Text and drawings will appear here:</p>
        {texts.map((text, index) => (
          <div
            key={index}
            className="text-block"
          >
            {text.content}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
