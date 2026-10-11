import React from "react";
import { Monitor, Sun, Moon } from "lucide-react";
export default function Settings({ prefs, update }) {
  return (
    <div className="v2-settings">
      <h3>Look & feel</h3>
      <p>Appearance</p>
      <div className="v2-segment">
        {[
          ["system", Monitor],
          ["light", Sun],
          ["dark", Moon],
        ].map(([value, Icon]) => (
          <button
            key={value}
            aria-pressed={prefs.theme === value}
            onClick={() => update({ theme: value })}
          >
            <Icon size={16} />
            {value}
          </button>
        ))}
      </div>
      <label>
        Text size
        <select
          value={prefs.size}
          onChange={(e) => update({ size: e.target.value })}
        >
          <option value="standard">Standard</option>
          <option value="large">Large</option>
          <option value="extra">Extra large</option>
        </select>
      </label>
      <div className="v2-type-preview">
        <strong>A little time. A clearer picture.</strong>
        <p>Catch up with the stories that matter, one summary at a time.</p>
      </div>
      <label>
        News language
        <select
          value={prefs.language}
          onChange={(e) => update({ language: e.target.value })}
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </label>
      <p className="v2-note">
        Changes summaries and narration. Menus remain in English. Audio already
        playing keeps its original language.
      </p>
      <h3>Your routine</h3>
      <label>
        Open RadioNews in
        <select
          value={prefs.start}
          onChange={(e) => update({ start: e.target.value })}
        >
          <option value="last">Last used</option>
          <option value="listen">Listen</option>
          <option value="swipe">Swipe</option>
          <option value="scroll">Scroll</option>
        </select>
      </label>
      <label>
        Listening speed
        <select
          value={prefs.speed}
          onChange={(e) => update({ speed: Number(e.target.value) })}
        >
          {[0.75, 1, 1.25, 1.5, 2].map((n) => (
            <option key={n} value={n}>
              {n}×
            </option>
          ))}
        </select>
      </label>
      <label>
        Reduce motion
        <select
          value={prefs.motion}
          onChange={(e) => update({ motion: e.target.value })}
        >
          <option value="system">Follow device</option>
          <option value="reduce">On</option>
        </select>
      </label>
      <h3>About & privacy</h3>
      <p className="v2-note">
        RadioNews combines related reporting into summaries. Open the source
        outlets for the original articles. Summaries may contain errors.
      </p>
      <p className="v2-note">
        Appearance, topic preferences and guest reading progress are stored on
        this device. Signing in connects your interest selections to your
        account. V2 preferences are separate from the original interface.
      </p>
      <a className="v2-link" href="/settings">
        Open existing account settings ↗
      </a>
    </div>
  );
}
