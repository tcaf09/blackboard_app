import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function LoginSignup() {
  const userRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const confPasswordRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const loginForm = (
    <>
      <div>
        <label htmlFor="username" className="text-stone-300">
          Username:
        </label>
        <br />
        <input
          type="text"
          id="username"
          className="p-2 rounded-lg bg-stone-800 border border-stone-600 focus:border-stone-300 transition-all! ease-in-out duration-300 text-stone-300 focus:outline-none"
          ref={userRef}
        />
      </div>
      <div>
        <label htmlFor="password" className="text-stone-300">
          Password
        </label>
        <br />
        <input
          type="password"
          id="password"
          className="p-2 rounded-lg bg-stone-800 border border-stone-600 focus:border-stone-300 transition-all! ease-in-out duration-300 text-stone-300 focus:outline-none"
          ref={passwordRef}
        />
      </div>
    </>
  );

  const signupForm = (
    <>
      <div>
        <label htmlFor="username" className="text-stone-300">
          Username:
        </label>
        <br />
        <input
          type="text"
          id="username"
          className="p-2 rounded-lg bg-stone-800 border border-stone-600 focus:border-stone-300 transition-all! ease-in-out duration-300 text-stone-300 focus:outline-none"
          ref={userRef}
        />
      </div>
      <div>
        <label htmlFor="password" className="text-stone-300">
          Password:
        </label>
        <br />
        <input
          type="password"
          id="password"
          className="p-2 rounded-lg bg-stone-800 border border-stone-600 focus:border-stone-300 transition-all! ease-in-out duration-300 text-stone-300 focus:outline-none"
          ref={passwordRef}
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="text-stone-300">
          Confirm Password:
        </label>
        <br />
        <input
          type="password"
          id="confirmPassword"
          className="p-2 rounded-lg bg-stone-800 border border-stone-600 focus:border-stone-300 transition-all! ease-in-out duration-300 text-stone-300 focus:outline-none"
          ref={confPasswordRef}
        />
      </div>
      <div>
        <label htmlFor="email" className="text-stone-300">
          Email:
        </label>
        <br />
        <input
          type="email"
          id="email"
          className="p-2 rounded-lg bg-stone-800 border border-stone-600 focus:border-stone-300 transition-all! ease-in-out duration-300 text-stone-300 focus:outline-none"
          ref={emailRef}
        />
      </div>
    </>
  );

  const toggleOption = (option: "login" | "signup") => {
    setOption(option);
    setError(null);
  };

  const [option, setOption] = useState<"login" | "signup">("login");
  useEffect(()=>{
    const authToken = localStorage.getItem("token")
    if (authToken) {
      navigate("/dashboard")
    }
  },[])
  async function login(username: string, password: string) {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      localStorage.setItem("token", data.accessToken);
      navigate("/dashboard");
    } catch (err) {
      console.log(err);
    }
  }

  async function signUp(username: string, password: string, email: string) {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, email }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      localStorage.setItem("token", data.accessToken);
      navigate("/dashboard");
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-stone-900 border border-stone-700 w-auto h-11/12 rounded-2xl flex flex-col items-center justify-between px-24 py-5">
        <div className="flex h-12 rounded-full bg-stone-800 border border-stone-600 justify-between w-full p-1 relative">
          <div
            className={`absolute ${
              option === "login"
                ? "translate-x-0 w-28"
                : "translate-x-[calc(100%+1.0rem)] w-24"
            } h-10 rounded-full bg-stone-700 border border-stone-500 text-stone-300 transition-all! duration-150
             ease-in-out`}
          ></div>
          <p
            onClick={() => toggleOption("login")}
            className={`cursor-pointer rounded-full z-50 ${
              option === "login" ? "text-stone-300" : "text-stone-500"
            } px-10 py-2`}
          >
            Login
          </p>
          <p
            className={`cursor-pointer rounded-full px-5 py-2 z-50 ${
              option === "signup" ? "text-stone-300" : "text-stone-500"
            }`}
            onClick={() => {
              toggleOption("signup");
            }}
          >
            Signup
          </p>
        </div>
        <div className="h-12 w-full mb-4">
          {error && (
            <div className="p-1 border border-red-900 rounded-lg my-10 bg-red-900/20 text-red-900">
              {error}
            </div>
          )}
        </div>
        <div className="flex flex-col grow justify-evenly">
          {option === "login" ? loginForm : signupForm}
        </div>
        <button
          className="text-stone-300 bg-stone-700  hover:bg-stone-600 border border-stone-600 w-3/4 rounded-full py-2 my-5 cursor-pointer transition-all! duration-300 ease-in-out"
          onClick={() => {
            if (option === "login" && userRef.current && passwordRef.current) {
              login(userRef.current.value, passwordRef.current.value);
            }
            if (
              option === "signup" &&
              userRef.current &&
              emailRef.current &&
              passwordRef.current &&
              confPasswordRef.current
            ) {
              if (
                passwordRef.current.value !== confPasswordRef.current.value &&
                option === "signup"
              ) {
                setError("Passwords must match");
              } else {
                signUp(
                  userRef.current.value,
                  passwordRef.current.value,
                  emailRef.current.value
                );
              }
            }
          }}
        >
          {option === "login" ? "Login" : "Sign Up"}
        </button>
      </div>
    </div>
  );
}

export default LoginSignup;
