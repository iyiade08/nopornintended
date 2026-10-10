import { useEffect, useState } from "react";

const STORAGE_KEY = "age-confirmed";

const AgeGate = () => {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "true";
    } catch {
      return true;
    }
  });

  // lock page scroll while the gate is showing
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleConfirm = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // storage blocked, gate will just show again next visit
    }
    setIsOpen(false);
  };

  const handleExit = () => {
    window.location.href = "https://www.google.com";
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#130F1E] p-8 text-center shadow-2xl">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FD3E81] to-[#895CF5] font-anton text-2xl text-white">
          18+
        </span>

        <h2
          id="age-gate-title"
          className="font-anton text-3xl tracking-wide bg-gradient-to-br from-[#FD3E81] via-[#CB4CB5] to-[#895CF5] bg-clip-text text-transparent"
        >
          Adults Only
        </h2>

        <p className="mt-3 font-poppins text-sm text-slate-300">
          This website contains adult content and is intended for people aged 18
          or older (or the legal age in your location). By entering, you confirm
          that you meet this requirement.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            className="rounded-lg bg-gradient-to-br from-[#FD3E81] to-[#895CF5] px-6 py-3 font-poppins font-semibold text-white transition-opacity hover:opacity-90"
          >
            I am 18 or older, enter
          </button>
          <button
            onClick={handleExit}
            className="rounded-lg border border-white/20 px-6 py-3 font-poppins font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Exit
          </button>
        </div>

        <p className="mt-6 font-poppins text-xs text-slate-500">
          By entering you also agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default AgeGate;
