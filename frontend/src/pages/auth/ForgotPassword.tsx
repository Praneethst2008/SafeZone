import React, { useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";

const ForgotPassword = ({ onNavigate }: { onNavigate: (view: "login" | "signup" | "forgot-password") => void }) => {
    const [step, setStep] = useState(1); // 1: Phone, 2: OTP + New Password
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
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

    const handleResetPassword = async () => {
        if (!otp) {
            toast.error("Please enter the OTP.");
            return;
        }
        if (!validatePassword(newPassword)) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        try {
            await axios.post("http://localhost:5000/api/auth/reset-password", {
                phoneNumber,
                otp,
                newPassword
            });

            toast.success("Password Reset Successful! Please Login.");
            onNavigate("login");
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to reset password.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center px-6 py-10">
            <h1 className="text-5xl font-bold text-red-700 mt-10 mb-16">
                SafeZone
            </h1>

            <h2 className="text-3xl font-bold text-gray-800 mb-8">
                {step === 1 ? "Forgot Password" : "Reset Password"}
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
                        New Password
                    </label>
                    <input
                        type="password"
                        placeholder="Enter new password"
                        className="w-full max-w-md bg-white px-4 py-4 rounded-2xl text-lg shadow-sm outline-none"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />

                    <label className="text-xl font-semibold text-red-700 w-full max-w-md mt-6 mb-2">
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        placeholder="Confirm new password"
                        className="w-full max-w-md bg-white px-4 py-4 rounded-2xl text-lg shadow-sm outline-none"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />

                    <button
                        onClick={handleResetPassword}
                        className="w-full max-w-md mt-10 py-4 text-3xl font-semibold text-white rounded-2xl shadow-md 
            bg-gradient-to-r from-red-400 to-red-700"
                    >
                        Reset Password
                    </button>
                </>
            )}

            <p className="mt-8 text-lg">
                Back to{" "}
                <span
                    className="text-red-600 font-semibold cursor-pointer"
                    onClick={() => onNavigate("login")}
                >
                    Login
                </span>
            </p>
        </div>
    );
};

export default ForgotPassword;