import { Home, ScanFace, Plus, Lock, List } from "lucide-react";

interface NavBarProps {
  onNavigate: (page: string) => void;
}

const NavBar = ({ onNavigate }: NavBarProps) => {
  return (
    <nav
      className="
        fixed bottom-6 left-1/2 -translate-x-1/2
        w-[95%] sm:w-[90%] md:w-[70%]
        bg-red-500/95
        rounded-3xl
        shadow-xl
        px-6 py-4
        flex items-center justify-between
        z-10
      "
    >
      {/* HOME */}
      <button className="nav-icon" onClick={() => onNavigate("home")}>
        <Home className="icon-size text-white" />
      </button>

      {/* RECORDER */}
      <button className="nav-icon" onClick={() => onNavigate("recorder")}>
        <ScanFace className="icon-size text-white" />
      </button>

      {/* FLOATING CENTER BUTTON */}
      <button
        className="
          bg-white text-red-500
          rounded-full shadow-lg
          w-14 h-14 sm:w-16 sm:h-16
          flex items-center justify-center
          -mt-10
          transition-transform duration-200
          hover:scale-105 active:scale-95
        "
        onClick={() => onNavigate("community")}
      >
        <Plus className="w-7 h-7 sm:w-8 sm:h-8" />
      </button>

      {/* VAULT */}
      <button className="nav-icon" onClick={() => onNavigate("vaultpasscode")}>
        <Lock className="icon-size text-white" />
      </button>

      {/* REPORT */}
      <button className="nav-icon" onClick={() => onNavigate("report")}>
        <List className="icon-size text-white" />
      </button>

      {/* INLINE UTILITY STYLES */}
      <style>{`
        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          border-radius: 50%;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .nav-icon:hover {
          transform: scale(1.15);
          opacity: 0.9;
        }
        .nav-icon:active {
          transform: scale(0.95);
        }

        .icon-size {
          width: 26px;
          height: 26px;
        }

        @media (min-width: 640px) {
          .icon-size {
            width: 30px;
            height: 30px;
          }
        }

        @media (min-width: 768px) {
          .icon-size {
            width: 34px;
            height: 34px;
          }
        }
      `}</style>
    </nav>
  );
};

export default NavBar;
