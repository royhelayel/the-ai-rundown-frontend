import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TheAIRundown from './TheAIRundown';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<TheAIRundown />} />
      </Routes>
    </Router>
  );
}

export default App;
