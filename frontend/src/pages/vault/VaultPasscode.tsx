import React, { useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import Header from "../../components/Header";
import { toast, ToastContainer } from "react-toastify";
import CheckIcon from "@mui/icons-material/Check";
import BackspaceIcon from "@mui/icons-material/Backspace";
import { apiFetch } from "../../utils/api";
import "react-toastify/dist/ReactToastify.css";

type Props = {
  setPage: (p: string) => void;
};

const VaultPasscode: React.FC<Props> = ({ setPage }) => {
  const [digits, setDigits] = useState<string[]>([]);
  const [confirmDigits, setConfirmDigits] = useState<string[]>([]);
  const [wrong, setWrong] = useState(false);
  const [hasPasscode, setHasPasscode] = useState<boolean | null>(null);
  const [lockedSeconds, setLockedSeconds] = useState<number | null>(null);

  const isCreateMode = hasPasscode === false;

  /* ---------------- LOAD STATE ---------------- */
  useEffect(() => {
    apiFetch("/api/vault/has-passcode")
      .then(res => res.json())
      .then(data => setHasPasscode(data.exists))
      .catch(() => toast.error("Vault check failed"));
  }, []);

  useEffect(() => {
    if (lockedSeconds === null) return;

    const t = setInterval(() => {
      setLockedSeconds(s => {
        if (!s || s <= 1) {
          clearInterval(t);
          return null;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [lockedSeconds]);


  /* ---------------- KEYPAD ---------------- */
  const addDigit = (d: string) => {
    if (isCreateMode && digits.length === 4) {
      if (confirmDigits.length < 4)
        setConfirmDigits(prev => [...prev, d]);
      return;
    }

    if (digits.length < 4)
      setDigits(prev => [...prev, d]);
  };

  const delDigit = () => {
    if (isCreateMode && confirmDigits.length > 0) {
      setConfirmDigits(prev => prev.slice(0, -1));
      return;
    }
    setDigits(prev => prev.slice(0, -1));
  };

  /* ---------------- CONFIRM ---------------- */
  const confirm = async () => {
    if (digits.length < 4) {
      toast.info("Enter 4 digits");
      return;
    }

    /* CREATE MODE */
    if (isCreateMode) {
      if (confirmDigits.length < 4) {
        toast.info("Confirm your passcode");
        return;
      }

      if (digits.join("") !== confirmDigits.join("")) {
        setWrong(true);
        toast.error("Passcodes do not match");
        setTimeout(() => {
          setWrong(false);
          setDigits([]);
          setConfirmDigits([]);
        }, 400);
        return;
      }

      await apiFetch("/api/vault/set-passcode", {
        method: "POST",
        body: JSON.stringify({ passcode: digits.join("") })
      });

      toast.success("Vault secured");
      setPage("vault");
      return;
    }

    /* VERIFY MODE */
    const res = await apiFetch("/api/vault/verify-passcode", {
      method: "POST",
      body: JSON.stringify({ passcode: digits.join("") })
    });

    const data = await res.json();

    if (res.status === 423) {
      setLockedSeconds(data.remainingSeconds);
      toast.error("Vault locked due to multiple failed attempts");
      return;
    }

    if (!res.ok) {
      setWrong(true);
      toast.error("Incorrect passcode");
      setTimeout(() => {
        setWrong(false);
        setDigits([]);
      }, 400);
      return;
    }

    setPage("vault");

  };

  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

  if (hasPasscode === null) return null;

  return (
    <div className="min-h-screen bg-gray-200 pt-20 pb-32">
      <ToastContainer />
      <Header onNavigate={setPage} />

      <main className="max-w-md mx-auto px-4">
        <section className="mt-6 flex flex-col items-center">

          <h2 className="text-2xl font-medium mb-4">
            {isCreateMode ? "Create Vault Passcode" : "Enter Vault Passcode"}
          </h2>

          {/* DOTS */}
          <div className={`flex gap-6 mb-2 ${wrong ? "animate-shake" : ""}`}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full ${i < digits.length ? "bg-gray-900" : "bg-gray-400/50"
                  }`}
              />
            ))}
          </div>

          {/* CONFIRM DOTS */}
          {isCreateMode && digits.length === 4 && (
            <div className="flex gap-6 mb-6">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full ${i < confirmDigits.length ? "bg-red-500" : "bg-gray-400/50"
                    }`}
                />
              ))}
            </div>
          )}

          {lockedSeconds !== null && (
            <div className="mb-4 text-center text-red-600 font-medium">
              Vault locked. Try again in {lockedSeconds}s
            </div>
          )}


          {/* KEYPAD */}
          <div className="grid grid-cols-3 gap-4">
            {keypad.map(k => (
              <button
                key={k}
                onClick={() => addDigit(k)}
                disabled={lockedSeconds !== null}
                className="w-20 h-20 rounded-full border-2 border-red-400 bg-white text-xl"
              >
                {k}
              </button>
            ))}

            <button
              onClick={delDigit}
              className="w-20 h-20 rounded-full bg-gray-600 text-white"
            >
              <BackspaceIcon />
            </button>

            <button
              onClick={confirm}
              className="w-20 h-20 rounded-full bg-red-500 text-white"
            >
              <CheckIcon />
            </button>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes shakeX {
          0% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
        .animate-shake {
          animation: shakeX 0.35s ease;
        }
      `}</style>

      <NavBar onNavigate={setPage} />

    </div>
  );
};

export default VaultPasscode;
