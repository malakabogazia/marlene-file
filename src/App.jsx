import React, { useState } from 'react';
import './styles.css';
import Globe3D from './Globe3D';

// Image paths - يمكنك تخصيص أو تغيير أي صورة خلفية لكل صفحة هنا بكل سهولة
const PAGE_1_BG = "/image/WhatsApp Image 2026-11-11 at 10.37.47 PM.jpeg";
const PAGE_2_BG = "/image/bg2.jpeg";
const PAGE_3_BG = "/image/bg2.jpeg";
const PAGE_4_BG = "/image/marlein office.jpeg";
const PAGE_5_BG = "/image/marlein office.jpeg";
const PAGE_6_BG = "/image/evidence-bg.jpeg";
const PAGE_7_BG = "/image/evidence-bg.jpeg";
const PAGE_8_BG = "/image/evidence-bg.jpeg";
const PAGE_9_BG = "/image/paper.jpeg";
const PAGE_10_BG = "/image/paper.jpeg";
const PAGE_11_BG = "/image/paper.jpeg";

const CUSTOM_LOGO_IMAGE = "/image/logo.png";
const MARLENE_CHARACTER_IMAGE = "/image/marlein.png";
const PAGE3_MARLENE_IMAGE = "/image/marlein2.png";
const PAGE7_MARLENE_IMAGE = "/image/marlein3.png";

const SCROLL_IMAGE = "/image/papyrus.png";
const ENVELOPE_IMAGE = "/image/envelope.png";

// Investigation data
const INVESTIGATION_DATA = {
  ice: {
    label: 'The ice is changing',
    locations: [
      { id: 'arctic', name: 'The arctic', lat: 78, lng: -40, num: '1' },
      { id: 'barents', name: 'The barents sea', lat: 74, lng: 35, num: '2' },
      { id: 'antarctic', name: 'The antarctic', lat: -75, lng: 0, num: '3' }
    ]
  },
  sea: {
    label: 'The sea is rising',
    locations: [
      { id: 'pacific', name: 'The Western Pacific', lat: 10, lng: 145, num: '1' },
      { id: 'us_west', name: 'The US West Coast', lat: 37, lng: -122, num: '2' },
      { id: 'coastline', name: 'A Third Coastline', lat: -15, lng: -45, num: '3' }
    ]
  },
  rain: {
    label: 'The rain is shifting',
    locations: [
      { id: 'wetter', name: 'A Wetter Land', lat: 22, lng: 78, num: '1' },
      { id: 'steady', name: 'A Steady Land', lat: -5, lng: -60, num: '2' },
      { id: 'sahel', name: 'The Sahel', lat: 15, lng: 10, num: '3' }
    ]
  }
};

// Timeline data
const TIMELINE_DATA = [
  { point: 1, year: 2000, extent: '6.32M km²', cx: 35, cy: 135, img: '/image/arctic-ice.jpg' },
  { point: 2, year: 2003, extent: '6.15M km²', cx: 65, cy: 110, img: '/image/arctic-ice.jpg' },
  { point: 3, year: 2007, extent: '4.30M km²', cx: 95, cy: 90, img: '/image/arctic-ice.jpg' },
  { point: 4, year: 2010, extent: '4.93M km²', cx: 125, cy: 105, img: '/image/arctic-ice.jpg' },
  { point: 5, year: 2012, extent: '3.63M km²', cx: 155, cy: 120, img: '/image/arctic-ice.jpg' },
  { point: 6, year: 2016, extent: '4.72M km²', cx: 185, cy: 85, img: '/image/arctic-ice.jpg' },
  { point: 7, year: 2020, extent: '3.92M km²', cx: 215, cy: 65, img: '/image/arctic-ice.jpg' },
  { point: 8, year: 2023, extent: '4.23M km²', cx: 245, cy: 75, img: '/image/arctic-ice.jpg' },
  { point: 9, year: 2026, extent: '3.80M km²', cx: 275, cy: 50, img: '/image/arctic-ice.jpg' },
  { point: 10, year: 2030, extent: '3.45M km²', cx: 305, cy: 40, img: '/image/arctic-ice.jpg' }
];

// Investigation files data
const CASE_FILES = [
  { id: '002', title: 'SEA ICE EXTENT', loc: 'THE BARENTS SEA' },
  { id: '003', title: 'SEA ICE EXTENT', loc: 'THE ANTARCTIC' },
  { id: '004', title: 'SEA ICE EXTENT', loc: 'THE WESTERN PACIFIC' },
  { id: '005', title: 'SEA ICE EXTENT', loc: 'THE US WEST COAST' },
  { id: '006', title: 'SEA ICE EXTENT', loc: 'A THIRD COASTLINE' },
  { id: '007', title: 'SEA ICE EXTENT', loc: 'A WETTER LAND' },
  { id: '008', title: 'SEA ICE EXTENT', loc: 'A STEADY LAND' },
  { id: '009', title: 'SEA ICE EXTENT', loc: 'THE SAHEL' }
];


// PAGE 10 & 11: Reusable comparison components
const CompareLocationCard = ({ title, yearRange, summary, evidence, stats, verdict, conclusion, sources }) => (
  <div className="cmp-folder-card">
    <div className="cmp-folder-tab">
      <span className="cmp-pin-icon">📍</span>
      <span className="cmp-tab-title">{title}</span>
      <span className="cmp-tab-year">{yearRange}</span>
    </div>
    <div className="cmp-folder-body">
      <div className="cmp-section-item">
        <h4>01- Case Summary</h4>
        <p>{summary}</p>
      </div>
      <div className="cmp-section-item">
        <h4>02- EVIDENCE COLLECTED</h4>
        <p>{evidence}</p>
      </div>
      <div className="cmp-section-item">
        <h4>03- STATISTICAL FINDINGS</h4>
        <p>{stats.line1}</p>
        <p>{stats.line2}</p>
      </div>
      <div className="cmp-section-item cmp-verdict-row">
        <h4>04- FINAL VERDICT</h4>
        <span className="cmp-stamp-badge">{verdict}</span>
      </div>
      <div className="cmp-section-item">
        <h4>05- CONCLUSION</h4>
        <p>{conclusion}</p>
      </div>
      <div className="cmp-section-item">
        <h4>06- SOURCES & LIMITATIONS</h4>
        <p>{sources}</p>
      </div>
    </div>
  </div>
);

const CompareSeaIceChart = () => (
  <div className="cmp-chart-wrapper">
    <div className="cmp-chart-title">Sea Ice Extent: Arctic vs Antarctic</div>
    <svg viewBox="0 0 320 155" className="cmp-line-chart" role="img" aria-label="Sea ice extent comparison chart">
      <text x="-80" y="12" transform="rotate(-90)" className="cmp-axis-label-title">Extent (million km²)</text>
      {[
        { val: 10, y: 20 }, { val: 8, y: 42 }, { val: 6, y: 64 },
        { val: 4, y: 86 }, { val: 2, y: 108 }, { val: 0, y: 130 }
      ].map((tick) => (
        <g key={tick.val}>
          <text x="32" y={tick.y + 3} className="cmp-axis-tick">{tick.val}</text>
          <line x1="40" y1={tick.y} x2="250" y2={tick.y} className="cmp-grid-line" />
        </g>
      ))}
      <line x1="40" y1="15" x2="40" y2="130" className="cmp-axis-line" />
      <line x1="40" y1="130" x2="250" y2="130" className="cmp-axis-line" />
      {[
        { year: '1980', x: 45 }, { year: '1990', x: 95 }, { year: '2000', x: 145 },
        { year: '2010', x: 195 }, { year: '2020', x: 245 }
      ].map((tick) => <text key={tick.year} x={tick.x} y="145" className="cmp-axis-tick-x">{tick.year}</text>)}
      <polyline fill="none" stroke="#2c3e50" strokeWidth="2" points="45,32 70,36 95,40 120,44 145,48 170,52 195,56 220,60 245,64" />
      {[[45,32],[70,36],[95,40],[120,44],[145,48],[170,52],[195,56],[220,60],[245,64]].map(([cx,cy],i) => <circle key={`arctic-${i}`} cx={cx} cy={cy} r="2.5" fill="#2c3e50" />)}
      <polyline fill="none" stroke="#c0392b" strokeWidth="2" points="45,50 70,54 95,58 120,62 145,66 170,70 195,74 220,78 245,82" />
      {[[45,50],[70,54],[95,58],[120,62],[145,66],[170,70],[195,74],[220,78],[245,82]].map(([cx,cy],i) => <circle key={`antarctic-${i}`} cx={cx} cy={cy} r="2.5" fill="#c0392b" />)}
      <g transform="translate(260, 60)">
        <line x1="0" y1="0" x2="12" y2="0" stroke="#2c3e50" strokeWidth="2" />
        <circle cx="6" cy="0" r="2.5" fill="#2c3e50" />
        <text x="16" y="3" className="cmp-legend-text">Arctic</text>
        <line x1="0" y1="16" x2="12" y2="16" stroke="#c0392b" strokeWidth="2" />
        <circle cx="6" cy="16" r="2.5" fill="#c0392b" />
        <text x="16" y="19" className="cmp-legend-text">Antarctic</text>
      </g>
    </svg>
  </div>
);

const compareLocationData = [
  {
    title: 'Arctic', yearRange: '2000-2020',
    summary: 'Sea Ice Extent in the Arctic region, showing a decreasing trend over time.',
    evidence: 'Satellite data from NSIDC Sea Ice Index',
    stats: { line1: 'Slope: -0.12 | P-value: 0.001', line2: 'Test: Mann-Kendall' },
    verdict: 'Statistically Significant',
    conclusion: 'A clear and statistically significant decline in Arctic sea ice extent.',
    sources: 'Source: NSIDC. Limitations: Satellite data uncertainty, regional variability.'
  },
  {
    title: 'Antarctic', yearRange: '2000-2020',
    summary: 'Sea Ice Extent in the Antarctic region, showing a decreasing trend over time.',
    evidence: 'Satellite data from NSIDC Sea Ice Index',
    stats: { line1: 'Slope: -0.08 | P-value: 0.001', line2: 'Test: Mann-Kendall' },
    verdict: 'Statistically Significant',
    conclusion: 'A clear and statistically significant decline in Antarctic sea ice extent.',
    sources: 'Source: NSIDC. Limitations: Satellite data uncertainty, regional variability.'
  },
  {
    title: 'Barents', yearRange: '2000-2020',
    summary: 'Sea Ice Extent in the Barents region, showing a decreasing trend over time.',
    evidence: 'Satellite data from NSIDC Sea Ice Index',
    stats: { line1: 'Slope: -0.10 | P-value: 0.001', line2: 'Test: Mann-Kendall' },
    verdict: 'Statistically Significant',
    conclusion: 'A clear and statistically significant decline in Barents sea ice extent.',
    sources: 'Source: NSIDC. Limitations: Satellite data uncertainty, regional variability.'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('INTRO');
  const [currentPage, setCurrentPage] = useState(1);
  const [userName, setUserName] = useState('');

  const [selectedHunch, setSelectedHunch] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [proofStep, setProofStep] = useState(1);
  const [timelinePoint, setTimelinePoint] = useState(1);

  const currentData = TIMELINE_DATA[timelinePoint - 1];
  const selectedYear = currentData.year;

  // Background selection - تحديد خلفية مستقلة تماماً لكل صفحة على حدة
  let currentBg = PAGE_1_BG;

  if (currentPage === 1) {
    currentBg = PAGE_1_BG;
  } else if (currentPage === 2) {
    currentBg = PAGE_2_BG;
  } else if (currentPage === 3) {
    currentBg = PAGE_3_BG;
  } else if (currentPage === 4) {
    currentBg = PAGE_4_BG;
  } else if (currentPage === 5) {
    currentBg = PAGE_5_BG;
  } else if (currentPage === 6) {
    currentBg = PAGE_6_BG;
  } else if (currentPage === 7) {
    currentBg = PAGE_7_BG;
  } else if (currentPage === 8) {
    currentBg = PAGE_8_BG;
  } else if (currentPage === 9) {
    currentBg = PAGE_9_BG;
  } else if (currentPage === 10) {
    currentBg = PAGE_10_BG;
  } else if (currentPage === 11) {
    currentBg = PAGE_11_BG;
  }

  const openEvidenceRoom = () => {
    setProofStep(1);
    setTimelinePoint(1);
    setCurrentPage(7);
  };

  return (
    <div
      className="app-container"
      style={{
        backgroundImage: currentBg ? `url('${currentBg}')` : 'none'
      }}
    >
      <div className={`overlay ${currentPage === 5 ? 'globe-stage-overlay' : ''}`}></div>

      <div className="content-wrapper">

        {/* HEADER */}
        <header className="header">
          <div>
            <h2 className="brand-title">THE MARLENE FILE</h2>
            <p className="brand-sub">EARTH SYSTEM TRACKING INITIATIVE</p>
          </div>

          <nav className="nav-menu">
            {['INTRO', 'GLOBE', 'CELEBRATE', 'CONNECT', 'OWN CASE', 'COMPARE/SOLUTION'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);

                  if (tab === 'INTRO') {
                    setCurrentPage(1);
                  }

                  if (tab === 'GLOBE') {
                    setCurrentPage(5);
                  }

                  if (tab === 'COMPARE/SOLUTION') {
                    setCurrentPage(10);
                  }
                }}
                className={`nav-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div>
            <img
              src={CUSTOM_LOGO_IMAGE}
              alt="The Marlene File Logo"
              className="logo-img"
            />
          </div>
        </header>

        {/* PAGE 1: INTRO */}
        {currentPage === 1 && (
          <main className="hero-section">
            <p className="case-tag">CASE FILE W. 2026 – STRICTLY CONFIDENTIAL</p>

            <h1 className="hero-title">
              Every Trend <br />
              <span>Leaves a Clue.</span>
            </h1>

            <p className="hero-desc">
              Curious reports have reached us from the corners of the Earth, my dear detective: water frozen in the poles, water risen in the seas, water fallen from the sky – and in each case, one place behaves quite unlike the next. Three cases, nine places, and one great water cycle at the heart of it all. You alone have been summoned to follow the water.
            </p>

            <button className="cta-btn" onClick={() => setCurrentPage(2)}>
              <span>Start Investigating</span>
              <span>→</span>
            </button>
          </main>
        )}

        {/* PAGE 2: MARLENE INTRO */}
        {currentPage === 2 && (
          <main className="main-content">
            <div className="papyrus-wrapper">
              <img
                src={SCROLL_IMAGE}
                alt="Papyrus Scroll"
                className="papyrus-bg-img"
              />

              <div className="papyrus-overlay-content">
                <p className="paper-text">
                  Well, hello there! I'm Marlene, and I've been waiting for a curious mind like yours. Together, we'll investigate Earth's changing patterns, follow the evidence, and uncover what the data really tells us!
                </p>

                <span className="next-arrow" onClick={() => setCurrentPage(3)}>
                  ›
                </span>
              </div>
            </div>

            <div className="character-wrapper">
              <img
                src={MARLENE_CHARACTER_IMAGE}
                alt="Marlene Character"
                className="character-img"
              />
            </div>
          </main>
        )}

        {/* PAGE 3: USER NAME */}
        {currentPage === 3 && (
          <main className="main-content">
            <div className="papyrus-wrapper">
              <img
                src={SCROLL_IMAGE}
                alt="Papyrus Scroll"
                className="papyrus-bg-img"
              />

              <div className="papyrus-overlay-content name-step-content">
                <h2 className="papyrus-title">But first, what should I call you ?!</h2>

                <div className="input-box-wrapper">
                  <input
                    type="text"
                    placeholder="Name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="papyrus-input"
                  />
                </div>

                <span
                  className="next-arrow"
                  onClick={() => {
                    if (userName.trim()) {
                      setCurrentPage(4);
                    } else {
                      alert('Please write the name first');
                    }
                  }}
                >
                  ›
                </span>
              </div>
            </div>

            <div className="character-wrapper">
              <img
                src={PAGE3_MARLENE_IMAGE}
                alt="Marlene Page 3"
                className="character-img"
              />
            </div>
          </main>
        )}

        {/* PAGE 4: OFFICE */}
        {currentPage === 4 && (
          <main className="office-section">
            <div className="speech-bubble">
              <p>Welcome to my office, {userName || 'Detective'}.</p>
              <p>Ready to investigate what Earth's data has been hiding? Let's start with the globe.</p>
            </div>

            <div
              className="globe-clickable-area"
              onClick={() => {
                setCurrentPage(5);
                setActiveTab('GLOBE');
              }}
              title="Click the globe to start!"
            ></div>
          </main>
        )}

        {/* PAGE 5: GLOBE */}
        {currentPage === 5 && (
          <main className="globe-stage-section">
            <div className="globe-3d-wrapper">
              <Globe3D
                locations={
                  selectedHunch
                    ? INVESTIGATION_DATA[selectedHunch].locations
                    : []
                }
                selectedLocation={selectedLocation}
                onSelectLocation={(locId) => setSelectedLocation(locId)}
              />
            </div>

            <aside className="case-file-card">
              <h3 className="case-file-header">Case File (0/9 proofs)</h3>

              <div className="case-file-grid">
                <div className="case-row">
                  <span className="case-label">FROZEN</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                </div>

                <div className="case-row">
                  <span className="case-label">RISING SEA</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                </div>

                <div className="case-row">
                  <span className="case-label">RAINFALL</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                </div>
              </div>
            </aside>

            <div className="investigation-controls">
              <div className="question-block">
                <h4 className="question-title">1. WHAT IS YOUR HUNCH ABOUT?</h4>

                <div className="pills-row">
                  {Object.entries(INVESTIGATION_DATA).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      className={`pill-btn ${selectedHunch === key ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedHunch(key);
                        setSelectedLocation(null);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedHunch && (
                <div className="question-block fade-in-up">
                  <h4 className="question-title">2. WHERE SHALL WE INVESTIGATE?</h4>

                  <div className="pills-row">
                    {INVESTIGATION_DATA[selectedHunch].locations.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        className={`pill-btn ${selectedLocation === loc.id ? 'selected' : ''}`}
                        onClick={() => setSelectedLocation(loc.id)}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedHunch && selectedLocation && (
              <button
                type="button"
                className="open-case-btn fade-in-up"
                onClick={() => {
                  setProofStep(1);
                  setTimelinePoint(1);
                  setCurrentPage(6);
                }}
              >
                <span>Open the case file</span>
                <span className="arrow-icon">›</span>
              </button>
            )}
          </main>
        )}

        {/* PAGE 6: EVIDENCE ROOM ENVELOPE */}
        {currentPage === 6 && (
          <main className="evidence-room-section">
            <div className="evidence-paper-box">
              <h4 className="evidence-subtitle">THE MARLENE FILE</h4>
              <h2 className="evidence-title">The evidence room</h2>

              <p className="evidence-desc">
                <span>SEA ICE EXTENT: ARCTIC OCEAN - 2000-2030</span>
                In Plain Words: Sea Ice Extent Is How Much Of The Ocean Surface Is Covered By Ice. We Look At September Each Year, When The Ice Is At Its Yearly Minimum, So The Seasons Do Not Blur The Picture.
              </p>
            </div>

            <aside className="case-file-card">
              <h3 className="case-file-header">Case File (0/9 proofs)</h3>

              <div className="case-file-grid">
                <div className="case-row">
                  <span className="case-label">FROZEN</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                </div>

                <div className="case-row">
                  <span className="case-label">RISING SEA</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                </div>

                <div className="case-row">
                  <span className="case-label">RAINFALL</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                  <span className="proof-box">?</span>
                </div>
              </div>
            </aside>

            <div
              className="envelope-container"
              onClick={openEvidenceRoom}
            >
              <img
                src={ENVELOPE_IMAGE}
                alt="Slide Case Paper Envelope"
                className="envelope-img"
              />
            </div>
          </main>
        )}

        {/* PAGE 7: INTERACTIVE PROOFS */}
        {currentPage === 7 && (() => {
          const marleneQuotes = {
            1: '"SOMETHING HAS CHANGED IN THIS FROZEN LANDSCAPE. BUT A PHOTOGRAPH ALONE CANNOT TELL US HOW MUCH - OR WHETHER THE CHANGE IS SIGNIFICANT."',
            2: '"THE PATTERN IS BECOMING CLEARER. BUT WE STILL NEED TO TEST WHETHER THIS CHANGE IS STATISTICALLY MEANINGFUL."',
            3: '"THE NUMBERS SUPPORT WHAT WE OBSERVED IN THE GRAPH. THIS DECLINE IS STATISTICALLY SIGNIFICANT. WE\'VE FOUND STRONG EVIDENCE OF A DOWNWARD TREND!"',
            4: '"THE NUMBERS TELL ONE STORY, BUT THE SCIENCE REVEALS THE BIGGER PICTURE. CASE ALMOST CLOSED!"'
          };

          return (
            <main className="evidence-room-stage">
              <div className="evidence-left-col">

                <div className="evidence-header-info">
                  <span className="evidence-mini-brand">THE MARLENE FILE</span>
                  <h2 className="evidence-main-title">The evidence room</h2>
                  <p className="evidence-topic-sub">
                    SEA ICE EXTENT: ARCTIC OCEAN - 2000-2030
                  </p>

                  <div className="plain-words-box">
                    <strong>In Plain Words:</strong> Sea Ice Extent Is How Much Of The Ocean Surface Is Covered By Ice. We Look At September Each Year, When The Ice Is At Its Yearly Minimum, So The Seasons Do Not Blur The Picture.
                  </div>
                </div>

                <div className="marlene-clue-row">
                  <img
                    src={PAGE7_MARLENE_IMAGE}
                    alt="Marlene"
                    className="marlene-avatar-card"
                  />

                  <div className="marlene-quote-card">
                    {marleneQuotes[proofStep]}
                  </div>
                </div>

                <aside className="case-file-card compact-case-card">
                  <h3 className="case-file-header">
                    Case File ({proofStep === 4 ? '1' : '0'}/9 proofs)
                  </h3>

                  <div className="case-file-grid">
                    <div className="case-row">
                      <span className="case-label">FROZEN</span>

                      <span className={`proof-box ${proofStep === 4 ? 'solved' : ''}`}>
                        {proofStep === 4 ? '✓' : '?'}
                      </span>

                      <span className={`proof-box ${proofStep === 4 ? 'solved' : ''}`}>
                        {proofStep === 4 ? '✓' : '?'}
                      </span>

                      <span className={`proof-box ${proofStep === 4 ? 'solved' : ''}`}>
                        {proofStep === 4 ? '✓' : '?'}
                      </span>
                    </div>

                    <div className="case-row">
                      <span className="case-label">RISING SEA</span>
                      <span className="proof-box">?</span>
                      <span className="proof-box">?</span>
                      <span className="proof-box">?</span>
                    </div>

                    <div className="case-row">
                      <span className="case-label">RAINFALL</span>
                      <span className="proof-box">?</span>
                      <span className="proof-box">?</span>
                      <span className="proof-box">?</span>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="evidence-right-col">
                <div className="big-cork-paper">
                  <div className="red-pin"></div>

                  <div className="paper-top-grid">
                    <div className="satellite-photo-wrapper">
                      <img
                        src={currentData.img}
                        alt="Arctic Sea Ice"
                        className="satellite-photo"
                      />

                      <span className="year-badge-overlay">
                        Year: {selectedYear} | Extent: {currentData.extent}
                      </span>
                    </div>

                    {proofStep >= 2 && (
                      <div className="graph-timeline-wrapper fade-in-up">
                        <div className="interactive-svg-chart">
                          <svg viewBox="0 0 340 160" className="trend-svg">
                            <line
                              x1="25"
                              y1="15"
                              x2="25"
                              y2="145"
                              stroke="#5c3a1e"
                              strokeWidth="2.5"
                            />

                            <line
                              x1="25"
                              y1="145"
                              x2="325"
                              y2="145"
                              stroke="#5c3a1e"
                              strokeWidth="2.5"
                            />

                            <polyline
                              fill="none"
                              stroke="#8b3a1e"
                              strokeWidth="3.5"
                              points={TIMELINE_DATA.slice(0, timelinePoint)
                                .map((d) => `${d.cx},${d.cy}`)
                                .join(' ')}
                            />

                            {TIMELINE_DATA.map((d) => {
                              const isActive = d.point === timelinePoint;
                              const isPassed = d.point <= timelinePoint;

                              return (
                                <g
                                  key={d.point}
                                  onClick={() => setTimelinePoint(d.point)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <circle
                                    cx={d.cx}
                                    cy={d.cy}
                                    r={isActive ? 7 : 4.5}
                                    fill={
                                      isActive
                                        ? '#d9534f'
                                        : isPassed
                                          ? '#8b3a1e'
                                          : '#c9b18c'
                                    }
                                    stroke="#fff"
                                    strokeWidth={isActive ? 2 : 0}
                                  />
                                </g>
                              );
                            })}
                          </svg>
                        </div>

                        <div className="time-machine-control">
                          <label className="tm-label">
                            Choose Your Time Period: From Point {timelinePoint} Of 10 ({selectedYear})
                          </label>

                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={timelinePoint}
                            onChange={(e) => setTimelinePoint(Number(e.target.value))}
                            className="tm-slider"
                          />

                          <div className="tm-years-row">
                            <span>2000</span>
                            <span>2015</span>
                            <span>2030</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {proofStep >= 3 && (
                    <div className="stats-verdict-grid fade-in-up">
                      <div className="stat-mini-cards">
                        <div className="stat-box">
                          <strong>-12.4%</strong>
                          <span>Change / Decade</span>
                        </div>

                        <div className="stat-box">
                          <strong>P = 0.001</strong>
                          <span>P-Value</span>
                        </div>

                        <div className="stat-box">
                          <strong>Mann-Kendall Trend Test</strong>
                          <span>Statistical Test</span>
                        </div>

                        <div className="stat-box">
                          <strong>A = 0.05</strong>
                          <span>Significance Level</span>
                        </div>
                      </div>

                      <div className="verdict-green-card">
                        <span className="verdict-check">✓</span>

                        <div>
                          <small>The Verdict:</small>
                          <h4>Statistically Significant</h4>
                        </div>
                      </div>
                    </div>
                  )}

                  {proofStep === 4 && (
                    <div className="scientific-notes-grid fade-in-up">
                      <div className="note-beige-card">
                        <p>
                          <strong>What was Observed:</strong> The ice here has retreated sharply decade upon decade, since records began in 1979.
                        </p>

                        <p>
                          <strong>How it was Tested:</strong> Examined by the Mann-Kendall trend test, with the seasons' natural rhythm set aside.
                        </p>

                        <p>
                          <strong>A Note on the Evidence:</strong> A placeholder figure for now the true reading shall come from NASA and NSIDC records.
                        </p>
                      </div>

                      <div className="notes-right-stack">
                        <div className="note-green-card">
                          <strong>Who this affects:</strong> Arctic communities and wildlife that depend on sea ice, plus northern shipping and fishing. Less ice also means the dark ocean absorbs more heat.
                        </div>

                        <div className="note-cream-card">
                          <strong>What scientists suggest:</strong> The Arctic has been warming much faster than the global average, and when bright ice melts, the dark ocean absorbs more heat, which can speed the melting further.
                        </div>
                      </div>
                    </div>
                  )}

                  {proofStep < 4 && (
                    <div className="proof-action-center">
                      <button
                        type="button"
                        className="proof-trigger-btn"
                        onClick={() => setProofStep((prev) => Math.min(prev + 1, 4))}
                      >
                        <span className="proof-badge">
                          PROOF {proofStep === 1 ? 'ONE' : proofStep === 2 ? 'TWO' : 'THREE'}
                        </span>

                        <span className="proof-text">
                          {proofStep === 1 && 'The raw readings, gathered over the years'}
                          {proofStep === 2 && 'The trend, traced through the data'}
                          {proofStep === 3 && 'The verdict, once all is weighed'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="paper-bottom-bar">
                  <div className="added-badges-row">
                    {proofStep >= 2 && (
                      <span className="added-pill">Proof one added ✓</span>
                    )}

                    {proofStep >= 3 && (
                      <span className="added-pill">Proof two added ✓</span>
                    )}

                    {proofStep === 4 && (
                      <span className="added-pill">Proof three added ✓</span>
                    )}
                  </div>

                  {proofStep === 4 && (
                    <div className="final-nav-btns">
                      <button
                        type="button"
                        className="wood-btn"
                        onClick={() => setCurrentPage(9)}
                      >
                        View Investigation Files / Report
                      </button>

                      <button
                        type="button"
                        className="wood-btn primary-wood"
                        onClick={() => setCurrentPage(5)}
                      >
                        Continue Investigating
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </main>
          );
        })()}

        {/* PAGE 9: CASE FILE 001 REPORT */}
        {currentPage === 9 && (
          <main 
            className="case-report-section fade-in-up"
          >
            <div className="case-report-page-background"></div>

            <div className="case-report-paper-container">

              <div className="report-header-block">
                <span className="report-mini-brand">THE MARLENE FILE</span>
                <span className="report-sub-brand">EARTH SYSTEM TREND DETECTIVE</span>
                <h2 className="report-main-title">Case File 001#</h2>
                <p className="report-sub-title">
                  SEA ICE EXTENT: ARCTIC OCEAN • 2000-2020
                </p>
              </div>

              <div className="report-grid-layout">

                <div className="report-left-stack">

                  {/* 01 - CASE SUMMARY */}
                  <div className="report-card-box">
                    <h4>01 – CASE SUMMARY</h4>

                    <div className="summary-row-content">
                      <div className="summary-thumb-circle"></div>
                      <p>
                        Our investigation focuses on the long-term trend of Arctic
                        sea ice extent and whether it shows a significant change
                        over time.
                      </p>
                    </div>
                  </div>

                  {/* 02 - EVIDENCE COLLECTED */}
                  <div className="report-card-box">
                    <h4>02 – EVIDENCE COLLECTED</h4>

                    <div className="evidence-3-cols">
                      <div className="mini-evidence-card">
                        <small>PROOF 1</small>
                        <p>The Scene</p>
                      </div>

                      <div className="mini-evidence-card">
                        <small>PROOF 2</small>
                        <p>The Timeline</p>
                      </div>

                      <div className="mini-evidence-card">
                        <small>PROOF 3</small>
                        <p>The Interpretation</p>
                      </div>
                    </div>
                  </div>

                  {/* 03 - STATISTICAL FINDINGS */}
                  <div className="report-card-box">
                    <h4>03 – STATISTICAL FINDINGS</h4>

                    <div className="stats-3-grid">
                      <div>
                        <span>Trend</span>
                        <strong>↓ Decreasing</strong>
                      </div>

                      <div>
                        <span>Slope</span>
                        <strong>-0.42</strong>
                      </div>

                      <div>
                        <span>P-value</span>
                        <strong>0.001</strong>
                      </div>
                    </div>
                  </div>

                  {/* 07 - MARLENE'S FINAL NOTE */}
                  <div className="report-card-box marlene-note-box">

                    <div className="marlene-note-header">
                      <img
                        src="/image/marlein3.png"
                        alt="Marlene"
                        className="report-marlene-avatar"
                      />

                      <h4>07 – MARLENE'S FINAL NOTE</h4>
                    </div>

                    <p className="marlene-quote-text">
                      "Well, detective, the evidence has spoken. But remember,
                      every conclusion has its limits. A good investigator knows
                      the difference between what the data reveals and what it
                      cannot tell us."
                    </p>

                  </div>
                </div>

                <div className="report-right-stack">

                  {/* 04 - FINAL VERDICT */}
                  <div className="report-card-box verdict-box-highlight">
                    <h4>04 – FINAL VERDICT</h4>

                    <div className="verdict-content-row">
                      <span className="big-green-check">✓</span>

                      <div>
                        <h3>Statistically Significant</h3>
                        <p>
                          The Arctic sea ice has shown a significant decreasing
                          trend from 2000 to 2020.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 05 - CONCLUSION */}
                  <div className="report-card-box">
                    <h4>05 – CONCLUSION</h4>

                    <p>
                      The analysis reveals a statistically significant decline
                      in Arctic sea ice extent over the selected period. This
                      finding highlights a long-term change in the Arctic sea
                      ice system. However, the statistical trend alone cannot
                      establish its causes.
                    </p>
                  </div>

                  {/* 06 - SOURCES & LIMITATIONS */}
                  <div className="report-card-box">
                    <h4>06 – SOURCES & LIMITATIONS</h4>

                    <ul className="sources-list">
                      <li>Source: NSIDC Sea Ice Index.</li>
                      <li>
                        Limitation: The analysis identifies a trend, but does
                        not establish its cause.
                      </li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* FOOTER BUTTONS */}
              <div className="report-footer-bar" style={{ gap: '20px' }}>

                <button
                  type="button"
                  className="return-globe-text-btn"
                  onClick={() => {
                    setCurrentPage(8);
                  }}
                >
                  View Investigation Files →
                </button>

                <button
                  type="button"
                  className="return-globe-text-btn"
                  onClick={() => {
                    setCurrentPage(5);
                    setActiveTab('GLOBE');
                  }}
                >
                  Return To The Globe
                </button>

              </div>

            </div>
          </main>
        )}

        {/* PAGE 8: INVESTIGATION FILES */}
        {currentPage === 8 && (
          <main className="investigation-files-section fade-in-up">
            <div className="files-clean-container">

              <div className="files-header-block-left">
                <span className="files-mini-brand">THE MARLENE FILE</span>
                <h2 className="files-main-title">Investigation Files</h2>
                <p className="files-sub-title">
                  EVERY COMPLETED INVESTIGATION, PRESERVED FOR FURTHER DISCOVERY
                </p>
              </div>

              <div className="cases-grid-3x3">

                <div className="case-item-card completed-case">
                  <div className="case-card-top">
                    <span className="case-num-tag">CASE FILE 001#</span>
                    <span className="case-status-badge green-badge">✓ Completed</span>
                  </div>

                  <h4 className="case-title-text">SEA ICE EXTENT</h4>
                  <p className="case-location-text">📍 ARCTIC OCEAN</p>

                  <button
                    type="button"
                    className="case-action-btn orange-btn"
                    onClick={() => setCurrentPage(9)}
                  >
                    Open Case File
                  </button>
                </div>

                {CASE_FILES.map((item) => (
                  <div
                    key={item.id}
                    className="case-item-card locked-case"
                  >
                    <div className="case-card-top">
                      <span className="case-num-tag">CASE FILE {item.id}#</span>
                      <span className="case-status-badge dark-badge">🔒 Closed</span>
                    </div>

                    <h4 className="case-title-text">{item.title}</h4>
                    <p className="case-location-text">📍 {item.loc}</p>

                    <button
                      type="button"
                      className="case-action-btn muted-btn"
                      disabled
                    >
                      Start Investigate
                    </button>
                  </div>
                ))}

              </div>

              <div className="files-footer-bar-right" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="return-globe-text-btn"
                  onClick={() => setCurrentPage(10)}
                >
                  Compare Two Locations →
                </button>

                <button
                  type="button"
                  className="return-globe-text-btn"
                  onClick={() => {
                    setCurrentPage(5);
                    setActiveTab('GLOBE');
                  }}
                >
                  Return To The Globe
                </button>
              </div>

            </div>
          </main>
        )}

        {/* PAGE 10: COMPARE TWO LOCATIONS */}
        {currentPage === 10 && (
          <main className="cmp-page cmp-page-ten fade-in-up">
            <div className="cmp-parchment-board">
              <header className="cmp-board-header">
                <div className="cmp-brand-tag">
                  <span className="cmp-brand-main">THE MARLENE FILE</span>
                  <span className="cmp-brand-sub">EARTH SYSTEM TREND DETECTIVE</span>
                </div>
                <h1 className="cmp-main-title">Compare Two Locations</h1>
                <p className="cmp-subtitle">EXPLORE, COMPARE, DISCOVER THE BIGGER PICTURE</p>
              </header>

              <main className="cmp-board-grid cmp-two-grid">
                <CompareLocationCard {...compareLocationData[0]} />
                <CompareLocationCard {...compareLocationData[1]} />
                <div className="cmp-comparison-column">
                  <div className="cmp-folder-card cmp-chart-card">
                    <div className="cmp-folder-tab">
                      <span className="cmp-pin-icon">📍</span>
                      <span className="cmp-tab-title">The Comparison</span>
                      <span className="cmp-tab-year">2000-2020</span>
                    </div>
                    <div className="cmp-folder-body"><CompareSeaIceChart /></div>
                  </div>
                  <div className="cmp-summary-box">
                    <div className="cmp-dark-header">Comparison Summary</div>
                    <div className="cmp-summary-content">
                      <div className="cmp-summary-row"><span>🔍</span><p>Both regions show a significant decline in sea ice extent.</p></div>
                      <div className="cmp-summary-row"><span>📊</span><p>The Arctic has a steeper decline (-0.12 vs -0.08).</p></div>
                      <div className="cmp-summary-row"><span>🌐</span><p>This suggests sea ice loss may be more rapid in the Arctic.</p></div>
                    </div>
                  </div>
                  <div className="cmp-insight-box">
                    <div className="cmp-dark-header"><span className="cmp-star-icon">★</span> Key Insight</div>
                    <div className="cmp-insight-content"><p>Sea ice is shrinking worldwide, with the Arctic experiencing the faster decline.</p></div>
                  </div>
                </div>
              </main>

              <footer className="cmp-board-footer">
                <div className="cmp-marlene-banner">
                  <div className="cmp-avatar-frame"><img src={PAGE7_MARLENE_IMAGE} alt="Marlene" /></div>
                  <div className="cmp-marlene-text">
                    <h3>MARLENE'S FINAL ANALYSIS</h3>
                    <p>"After examining both case files, the evidence reveals a clear pattern: sea ice extent is declining in both regions, but at different rates. The Arctic shows a steeper decline than the Antarctic. Two regions, two different rates of change, and one important finding: every region has its own story to tell."</p>
                  </div>
                </div>
                <div className="cmp-footer-buttons">
                  <button type="button" className="cmp-return-btn" onClick={() => setCurrentPage(11)}>Compare Three Locations →</button>
                  <button type="button" className="cmp-return-btn" onClick={() => { setCurrentPage(5); setActiveTab('GLOBE'); }}>Return To The Globe</button>
                </div>
              </footer>
            </div>
          </main>
        )}

        {/* PAGE 11: COMPARE THREE LOCATIONS */}
        {currentPage === 11 && (
          <main className="cmp-page cmp-page-eleven fade-in-up">
            <div className="cmp-parchment-board cmp-board-eleven">
              <header className="cmp-board-header">
                <div className="cmp-brand-tag">
                  <span className="cmp-brand-main">THE MARLENE FILE</span>
                  <span className="cmp-brand-sub">EARTH SYSTEM TREND DETECTIVE</span>
                </div>
                <h1 className="cmp-main-title">Compare Three Locations</h1>
                <p className="cmp-subtitle">EXPLORE, COMPARE, DISCOVER THE BIGGER PICTURE</p>
              </header>

              <section className="cmp-top-locations-grid">
                {compareLocationData.map((location) => <CompareLocationCard key={location.title} {...location} />)}
              </section>

              <section className="cmp-bottom-analysis-grid">
                <div className="cmp-folder-card cmp-chart-card">
                  <div className="cmp-folder-tab">
                    <span className="cmp-pin-icon">📍</span>
                    <span className="cmp-tab-title">The Comparison</span>
                  </div>
                  <div className="cmp-folder-body"><CompareSeaIceChart /></div>
                </div>

                <div className="cmp-middle-summary-column">
                  <div className="cmp-summary-box">
                    <div className="cmp-dark-header">Comparison Summary</div>
                    <div className="cmp-summary-content">
                      <div className="cmp-summary-row"><span>🔍</span><p>All three regions show a decline in sea ice extent.</p></div>
                      <div className="cmp-summary-row"><span>📊</span><p>The Arctic has the steepest decline (-0.12), followed by Barents (-0.10) and Antarctic (-0.08).</p></div>
                      <div className="cmp-summary-row"><span>🌐</span><p>The rate of sea ice loss differs across the three regions.</p></div>
                    </div>
                  </div>
                  <div className="cmp-insight-box">
                    <div className="cmp-dark-header"><span className="cmp-star-icon">★</span> Key Insight</div>
                    <div className="cmp-insight-content"><p>Three regions show different rates of sea ice decline, with the strongest trend in the Arctic.</p></div>
                  </div>
                </div>

                <div className="cmp-marlene-analysis-card">
                  <h3>MARLENE'S FINAL ANALYSIS</h3>
                  <div className="cmp-marlene-card-body">
                    <p>After examining all three case files, the evidence reveals different patterns across the regions: the Arctic shows the strongest decline, while the Antarctic and Barents regions follow different rates of change. Three regions, one variable, and three distinct stories. The evidence is worth investigating further.</p>
                    <div className="cmp-avatar-frame-large"><img src={PAGE7_MARLENE_IMAGE} alt="Marlene" /></div>
                  </div>
                </div>
              </section>

              <footer className="cmp-board-footer cmp-board-footer-eleven">
                <button type="button" className="cmp-return-btn" onClick={() => { setCurrentPage(5); setActiveTab('GLOBE'); }}>Return To The Globe</button>
              </footer>
            </div>
          </main>
        )}

      </div>
    </div>
  );
}