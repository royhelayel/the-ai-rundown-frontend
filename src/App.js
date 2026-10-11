import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TheAIRundown from "./TheAIRundown";

const RadioNewsV2 = lazy(() => import("./v2/RadioNewsV2"));

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/preview/v2/*"
          element={
            <Suspense
              fallback={<p role="status">Loading RadioNews preview…</p>}
            >
              <RadioNewsV2 />
            </Suspense>
          }
        />
        <Route path="/*" element={<TheAIRundown />} />
      </Routes>
    </Router>
  );
}

export default App;
