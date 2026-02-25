import { useState } from "react";

const COURSE_DATA = [
  {
    id: "m1",
    number: "01",
    title: "Foundations of Machine Learning",
    progress: 100,
    topics: [
      {
        id: "t1",
        title: "Mathematical Prerequisites",
        progress: 100,
        lessons: [
          { id: "l1", title: "Linear Algebra for ML Engineers", duration: "24 min", status: "completed" },
          { id: "l2", title: "Probability & Statistics Refresher", duration: "32 min", status: "completed" },
          { id: "l3", title: "Calculus & Optimization Basics", duration: "28 min", status: "completed" },
        ],
      },
      {
        id: "t2",
        title: "Core Concepts & Terminology",
        progress: 100,
        lessons: [
          { id: "l4", title: "Supervised vs Unsupervised Learning", duration: "18 min", status: "completed" },
          { id: "l5", title: "Training, Validation & Test Sets", duration: "22 min", status: "completed" },
        ],
      },
    ],
  },
  {
    id: "m2",
    number: "02",
    title: "Neural Networks & Deep Learning",
    progress: 62,
    topics: [
      {
        id: "t3",
        title: "Perceptrons to Multi-Layer Networks",
        progress: 100,
        lessons: [
          { id: "l6", title: "The Perceptron — History & Intuition", duration: "20 min", status: "completed" },
          { id: "l7", title: "Activation Functions Demystified", duration: "26 min", status: "completed" },
          { id: "l8", title: "Backpropagation from Scratch", duration: "40 min", status: "completed" },
        ],
      },
      {
        id: "t4",
        title: "Convolutional Neural Networks",
        progress: 50,
        lessons: [
          { id: "l9", title: "Convolution Operations & Feature Maps", duration: "34 min", status: "completed" },
          { id: "l10", title: "Pooling, Stride & Architecture Patterns", duration: "30 min", status: "in-progress" },
          { id: "l11", title: "Transfer Learning with Pre-trained Models", duration: "38 min", status: "locked" },
          { id: "l12", title: "Building an Image Classifier (Lab)", duration: "55 min", status: "locked" },
        ],
      },
      {
        id: "t5",
        title: "Recurrent Neural Networks & Attention",
        progress: 0,
        lessons: [
          { id: "l13", title: "Sequence Modelling with RNNs & LSTMs", duration: "36 min", status: "locked" },
          { id: "l14", title: "The Attention Mechanism Explained", duration: "42 min", status: "locked" },
          { id: "l15", title: "Transformer Architecture Deep Dive", duration: "50 min", status: "locked" },
        ],
      },
    ],
  },
  {
    id: "m3",
    number: "03",
    title: "Applied ML & Production Systems",
    progress: 0,
    topics: [
      {
        id: "t6",
        title: "Data Pipelines & Feature Engineering",
        progress: 0,
        lessons: [
          { id: "l16", title: "Building Robust Data Pipelines", duration: "30 min", status: "locked" },
          { id: "l17", title: "Feature Selection & Dimensionality Reduction", duration: "28 min", status: "locked" },
        ],
      },
      {
        id: "t7",
        title: "Model Deployment & Monitoring",
        progress: 0,
        lessons: [
          { id: "l18", title: "Containerizing ML Models with Docker", duration: "35 min", status: "locked" },
          { id: "l19", title: "Real-time Inference & Scaling Strategies", duration: "40 min", status: "locked" },
          { id: "l20", title: "Monitoring Drift & Retraining Pipelines", duration: "32 min", status: "locked" },
        ],
      },
    ],
  },
];

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 14" fill="currentColor">
    <path d="M0 0L12 7L0 14V0Z"/>
  </svg>
);

const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="7" width="10" height="7" rx="1.5" strokeLinecap="round"/>
    <path d="M5.5 7V5a2.5 2.5 0 015 0v2" strokeLinecap="round"/>
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 16 16"
    fill="none"
    style={{
      transform: open ? "rotate(90deg)" : "rotate(0deg)",
      transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    }}
  >
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function LessonItem({ lesson, isActive }) {
  const isCompleted = lesson.status === "completed";
  const isInProgress = lesson.status === "in-progress";
  const isLocked = lesson.status === "locked";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "12px 18px 12px 14px",
        margin: "0 -10px 0 -14px",
        cursor: isLocked ? "default" : "pointer",
        opacity: isLocked ? 0.4 : 1,
        borderRadius: "8px",
        background: isActive ? "rgba(242, 237, 218, 0.08)" : "transparent",
        transition: "background 0.2s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!isLocked && !isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Status indicator */}
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: isCompleted
            ? "#F2EDDA"
            : isInProgress
            ? "transparent"
            : "transparent",
          border: isCompleted
            ? "2px solid #F2EDDA"
            : isInProgress
            ? "2px solid #F2EDDA"
            : "1.5px solid rgba(255,255,255,0.15)",
          color: isCompleted ? "#1a1a1e" : isInProgress ? "#F2EDDA" : "rgba(255,255,255,0.2)",
          position: "relative",
        }}
      >
        {isCompleted && <CheckIcon />}
        {isInProgress && <PlayIcon />}
        {isLocked && <LockIcon />}
        {/* Pulse ring for in-progress */}
        {isInProgress && (
          <div
            style={{
              position: "absolute",
              inset: "-4px",
              borderRadius: "50%",
              border: "1.5px solid rgba(242, 237, 218, 0.3)",
              animation: "pulse-ring 2s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "15.5px",
            fontFamily: "'Encode Sans', sans-serif",
            fontWeight: isActive ? 600 : 400,
            color: isInProgress
              ? "#f0f0f0"
              : isLocked
              ? "rgba(255,255,255,0.35)"
              : "rgba(255,255,255,0.9)",
            lineHeight: 1.4,
            textDecoration: isCompleted ? "none" : "none",
          }}
        >
          {lesson.title}
        </div>
      </div>

      {/* Active indicator bar */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: "3.5px",
            height: "28px",
            background: "#F2EDDA",
            borderRadius: "3px 0 0 3px",
          }}
        />
      )}
    </div>
  );
}

function TopicSection({ topic, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const completedCount = topic.lessons.filter((l) => l.status === "completed").length;
  const totalCount = topic.lessons.length;
  const allDone = completedCount === totalCount;

  return (
    <div style={{ marginBottom: "2px" }}>
      {/* Topic header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "13px 14px",
          background: "none",
          border: "none",
          cursor: "pointer",
          borderRadius: "8px",
          transition: "background 0.15s",
          textAlign: "left",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        <div style={{ color: "rgba(255,255,255,0.35)" }}>
          <ChevronIcon open={open} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "15.5px",
              fontFamily: "'Encode Sans', sans-serif",
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.35,
            }}
          >
            {topic.title}
          </div>
        </div>

      </button>

      {/* Lessons - animated expand */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div style={{ paddingLeft: "24px", paddingBottom: open ? "4px" : 0 }}>
            {topic.lessons.map((lesson) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                isActive={lesson.id === "l10"}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleSection({ module, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const isFullyComplete = module.progress === 100;
  const hasProgress = module.progress > 0;

  return (
    <div
      style={{
        marginBottom: "6px",
        borderRadius: "12px",
        background: open ? "rgba(255,255,255,0.02)" : "transparent",
        transition: "background 0.25s",
      }}
    >
      {/* Module header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",
          padding: "18px 18px",
          background: "none",
          border: "none",
          cursor: "pointer",
          borderRadius: "12px",
          textAlign: "left",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "none";
        }}
      >
        {/* Module number + progress ring */}
        <div style={{ position: "relative", flexShrink: 0, marginTop: "1px" }}>
          <svg width="46" height="46" viewBox="0 0 46 46">
            {/* Background track */}
            <circle
              cx="23"
              cy="23"
              r="20"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="2.5"
            />
            {/* Progress arc */}
            {hasProgress && (
              <circle
                cx="23"
                cy="23"
                r="20"
                fill="none"
                stroke={isFullyComplete ? "#F2EDDA" : "rgba(242, 237, 218, 0.7)"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${(module.progress / 100) * 125.66} 125.66`}
                transform="rotate(-90 23 23)"
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            )}
            {/* Number */}
            <text
              x="23"
              y="24"
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontSize: "14px",
                fontFamily: "'Encode Sans', sans-serif",
                fontWeight: 500,
                fill: isFullyComplete
                  ? "#F2EDDA"
                  : hasProgress
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(255,255,255,0.25)",
              }}
            >
              {module.number}
            </text>
          </svg>
        </div>

        {/* Title & meta */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: "2px" }}>
          <div
            style={{
              fontSize: "12.5px",
              fontFamily: "'Encode Sans', sans-serif",
              fontWeight: 500,
              textTransform: "uppercase",
              color: isFullyComplete
                ? "rgba(242,237,218,0.5)"
                : hasProgress
                ? "rgba(242,237,218,0.4)"
                : "rgba(255,255,255,0.2)",
              marginBottom: "5px",
            }}
          >
            Module {module.number} {isFullyComplete && "· Complete"}
          </div>
          <div
            style={{
              fontSize: "16px",
              fontFamily: "'Encode Sans', sans-serif",
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.4,
            }}
          >
            {module.title}
          </div>
        </div>

        {/* Chevron */}
        <div
          style={{
            color: "rgba(255,255,255,0.25)",
            marginTop: "8px",
            flexShrink: 0,
          }}
        >
          <ChevronIcon open={open} />
        </div>
      </button>

      {/* Topics expand */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: "0 8px 12px 20px" }}>
            {/* Thin connecting line */}
            <div
              style={{
                borderLeft: "1.5px solid rgba(255,255,255,0.06)",
                marginLeft: "6px",
                paddingLeft: "12px",
              }}
            >
              {module.topics.map((topic, i) => (
                <TopicSection
                  key={topic.id}
                  topic={topic}
                  defaultOpen={topic.progress > 0 && topic.progress < 100}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LMSSidebar() {
  const totalLessons = COURSE_DATA.reduce(
    (acc, m) => acc + m.topics.reduce((a, t) => a + t.lessons.length, 0),
    0
  );
  const completedLessons = COURSE_DATA.reduce(
    (acc, m) =>
      acc +
      m.topics.reduce(
        (a, t) => a + t.lessons.filter((l) => l.status === "completed").length,
        0
      ),
    0
  );
  const overallProgress = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div
      style={{
        width: "440px",
        height: "100vh",
        background: "#141418",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Encode Sans', sans-serif",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Load fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Encode+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          left: "-50px",
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle, rgba(242,237,218,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div style={{ padding: "32px 28px 24px", flexShrink: 0 }}>
        {/* Breadcrumb */}
        <div
          style={{
            fontSize: "12.5px",
            fontFamily: "'Encode Sans', sans-serif",
            color: "rgba(255,255,255,0.25)",
            marginBottom: "16px",
            fontWeight: 500,
          }}
        >
          COURSES / ML-401
        </div>

        {/* Course title */}
        <h1
          style={{
            fontSize: "24px",
            fontFamily: "'Encode Sans', sans-serif",
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            lineHeight: 1.35,
            margin: 0,
          }}
        >
          Machine Learning
          <br />
          Fundamentals
        </h1>

        {/* Overall progress bar */}
        <div style={{ marginTop: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "12.5px",
                fontFamily: "'Encode Sans', sans-serif",
                color: "rgba(255,255,255,0.3)",
                fontWeight: 500,
              }}
            >
              PROGRESS
            </span>
            <span
              style={{
                fontSize: "24px",
                fontFamily: "'Encode Sans', sans-serif",
                fontWeight: 500,
                color: "#F2EDDA",
              }}
            >
              {overallProgress}
              <span style={{ fontSize: "14px", color: "rgba(242,237,218,0.5)" }}>%</span>
            </span>
          </div>
          <div
            style={{
              height: "4px",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${overallProgress}%`,
                background: "linear-gradient(90deg, #F2EDDA, #F7F4E8)",
                borderRadius: "4px",
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "rgba(255,255,255,0.2)",
              marginTop: "6px",
              fontFamily: "'Encode Sans', sans-serif",
            }}
          >
            {completedLessons} of {totalLessons} lessons completed
          </div>
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 28px" }} />

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px 36px",
        }}
        className="sidebar-scroll"
      >
        {COURSE_DATA.map((module) => (
          <ModuleSection
            key={module.id}
            module={module}
            defaultOpen={module.progress > 0 && module.progress < 100}
          />
        ))}
      </div>

      {/* Bottom action */}
      <div
        style={{
          padding: "20px 28px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <button
          style={{
            width: "100%",
            padding: "14px",
            background: "linear-gradient(135deg, #F2EDDA, #D9D4C0)",
            color: "#141418",
            border: "none",
            borderRadius: "12px",
            fontSize: "15.5px",
            fontFamily: "'Encode Sans', sans-serif",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 2px 12px rgba(242,237,218,0.15)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(242,237,218,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 12px rgba(242,237,218,0.15)";
          }}
        >
          Continue Learning →
        </button>
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}