import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const Login = ({ onNavigate }: { onNavigate: (view: "login" | "signup" | "forgot-password") => void }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  const validatePhone = (number: string) => /^[0-9]{10}$/.test(number);
  const validatePassword = (pass: string) => pass.length >= 6;

  const handleLogin = async () => {
    if (!validatePhone(phoneNumber)) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }

    if (!validatePassword(password)) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        phoneNumber,
        password,
      });

      const data = res.data;

      if (!data || data.token == null) {
        toast.warning(data?.message || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);

      toast.success("Login Successful!");

      // 🚀 Fast redirect — no delay
      window.location.href = "/home";

    } catch (error) {
      console.error(error);

      if (axios.isAxiosError(error) && error.response?.data) {
        toast.error(error.response.data.message || "Server error. Try again later.");
      } else {
        toast.error("Server error. Try again later.");
      }
    }
  };


  return (
    <div className="min-h-screen bg-gray-200/75 flex flex-col items-center px-6 py-10">
      <h1 className="text-5xl font-bold text-red-700 mt-10 mb-16">
        SafeZone
      </h1>

      {/* PHONE INPUT */}
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
          const value = e.target.value.replace(/\D/g, ""); // allow only digits
          setPhoneNumber(value);
        }}
      />

      {/* PASSWORD INPUT */}
      <label className="text-xl font-semibold text-red-700 w-full max-w-md mt-6 mb-2">
        Password
      </label>
      <input
        type="password"
        placeholder="Enter your password here"
        className="w-full max-w-md bg-white px-4 py-4 rounded-2xl text-lg shadow-sm outline-none"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="w-full max-w-md text-right mt-2">
        <button className="text-red-600 text-lg font-medium"
          onClick={() => onNavigate("forgot-password")}
        >
          Forgot Password
        </button>
      </div>

      <button
        onClick={handleLogin}
        className="w-full max-w-md mt-8 py-4 text-3xl font-semibold text-white rounded-2xl 
        bg-red-500 hover:bg-gradient-to-r from-red-500 to-red-800 shadow-md cursor-pointer "
      >
        Login
      </button>

      <p className="mt-6 text-lg">
        Don’t have an account?{" "}
        <span
          className="text-red-600 font-semibold cursor-pointer"
          onClick={() => onNavigate("signup")}
        >
          Sign up here
        </span>
      </p>
    </div>
  );
};

export default Login;
