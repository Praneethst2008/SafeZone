import React, { useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";

const SignUp = ({ onNavigate }: { onNavigate: (view: "login" | "signup" | "forgot-password") => void }) => {
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP + Details
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const validatePhone = (number: string) => /^[0-9]{10}$/.test(number);
  const validatePassword = (pass: string) => pass.length >= 6;

  const handleSendOTP = async () => {
    if (!validatePhone(phoneNumber)) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/send-otp", { phoneNumber });
      toast.success("OTP sent! Check your messages/console.");
      setStep(2);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to send OTP.");
    }
  };

  const handleSignup = async () => {
    if (!otp) {
      toast.error("Please enter the OTP.");
      return;
    }
    if (!validatePassword(password)) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.warning("Passwords do not match");
      return;
    }

    try {
      // Atomic Signup with OTP
      await axios.post("http://localhost:5000/api/auth/signup", {
        phoneNumber,
        password,
        otp
      });

      toast.success("Signup Successful! Please Login.");
      onNavigate("login");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Signup failed. Try again later.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center px-6 py-10">
      <h1 className="text-5xl font-bold text-red-700 mt-10 mb-16">
        SafeZone
      </h1>

      <h2 className="text-3xl font-bold text-gray-800 mb-8">
        {step === 1 ? "Sign Up" : "Verify & Complete"}
      </h2>

      {step === 1 && (
        <>
          <label className="text-xl font-semibold text-red-700 w-full max-w-md mb-2">
            Phone Number
          </label>
          <input
            type="text"
            maxLength={10}
            placeholder="Enter your number here"
            className="w-full max-w-md bg-white px-4 py-4 rounded-2xl text-lg shadow-sm outline-none"
            value={phoneNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setPhoneNumber(value);
            }}
          />

          <button
            onClick={handleSendOTP}
            className="w-full max-w-md mt-10 py-4 text-3xl font-semibold text-white rounded-2xl shadow-md 
            bg-gradient-to-r from-red-400 to-red-700"
          >
            Send OTP
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <label className="text-xl font-semibold text-red-700 w-full max-w-md mb-2">
            OTP
          </label>
          <input
            type="text"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            className="w-full max-w-md bg-white px-4 py-4 rounded-2xl text-lg shadow-sm outline-none"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setOtp(value);
            }}
          />

          <label className="text-xl font-semibold text-red-700 w-full max-w-md mt-6 mb-2">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter a strong password"
            className="w-full max-w-md bg-white px-4 py-4 rounded-2xl text-lg shadow-sm outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label className="text-xl font-semibold text-red-700 w-full max-w-md mt-6 mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            placeholder="Confirm your password"
            className="w-full max-w-md bg-white px-4 py-4 rounded-2xl text-lg shadow-sm outline-none"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            onClick={handleSignup}
            className="w-full max-w-md mt-10 py-4 text-3xl font-semibold text-white rounded-2xl shadow-md 
            bg-gradient-to-r from-red-400 to-red-700"
          >
            Sign Up
          </button>
        </>
      )}

      <p className="mt-8 text-lg">
        Already have an account?{" "}
        <span
          className="text-red-600 font-semibold cursor-pointer"
          onClick={() => onNavigate("login")}
        >
          Login here
        </span>
      </p>
    </div>
  );
};

export default SignUp;
