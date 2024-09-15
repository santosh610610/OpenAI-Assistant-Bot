"use client";
import React from "react";

function MainComponent() {
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [openAIKey, setOpenAIKey] = React.useState("");
  const [assistantId, setAssistantId] = React.useState("");
  const [connected, setConnected] = React.useState(false);
  const [threadId, setThreadId] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [activeMenu, setActiveMenu] = React.useState("chat");
  const [theme, setTheme] = React.useState("light");
  const [appName, setAppName] = React.useState("OpenAI Assistant Chatbot");

  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=G-M4FHL4EC6K`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-M4FHL4EC6K');
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);


  const themes = {
    light: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      sidebar: "bg-[#227c9d]",
      input: "bg-white text-gray-800",
      button: "bg-[#227c9d] hover:bg-[#1d6a86] text-white",
    },
    dark: {
      bg: "bg-gray-900",
      text: "text-white",
      sidebar: "bg-gray-800",
      input: "bg-gray-700 text-white",
      button: "bg-gray-800 hover:bg-gray-700 text-white",
    },
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      sidebar: "bg-blue-800",
      input: "bg-white text-blue-800",
      button: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-800",
      sidebar: "bg-green-800",
      input: "bg-white text-green-800",
      button: "bg-green-600 hover:bg-green-700 text-white",
    },
  };

  const handleSendMessage = async () => {
    if (!openAIKey || !assistantId) {
      setMessages([
        ...messages,
        {
          text: "Please go to the Settings page to update the OpenAI API Key and Assistant ID before chatting.",
          sender: "system",
        },
      ]);
      return;
    }

    if (input.trim() && connected) {
      setMessages([...messages, { text: input, sender: "user" }]);
      setInput("");
      setLoading(true);

      try {
        const messageResponse = await fetch(
          `https://api.openai.com/v1/threads/${threadId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openAIKey}`,
              "Content-Type": "application/json",
              "OpenAI-Beta": "assistants=v2",
            },
            body: JSON.stringify({ role: "user", content: input }),
          }
        );

        if (!messageResponse.ok) throw new Error("Failed to send message");

        const runResponse = await fetch(
          `https://api.openai.com/v1/threads/${threadId}/runs`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openAIKey}`,
              "Content-Type": "application/json",
              "OpenAI-Beta": "assistants=v2",
            },
            body: JSON.stringify({ assistant_id: assistantId }),
          }
        );

        if (!runResponse.ok) {
          const errorData = await runResponse.json();
          throw new Error(errorData.error.message || "Failed to start run");
        }

        const runData = await runResponse.json();
        await waitForCompletion(runData.id);

        const messagesResponse = await fetch(
          `https://api.openai.com/v1/threads/${threadId}/messages`,
          {
            headers: {
              Authorization: `Bearer ${openAIKey}`,
              "OpenAI-Beta": "assistants=v2",
            },
          }
        );

        if (!messagesResponse.ok) throw new Error("Failed to fetch messages");

        const messagesData = await messagesResponse.json();
        const assistantMessage = messagesData.data.find(
          (m) => m.role === "assistant"
        );

        if (assistantMessage) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              text: assistantMessage.content[0].text.value,
              sender: "assistant",
            },
          ]);
        }
      } catch (error) {
        console.error("Error:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: `Error: ${error.message}`, sender: "system" },
        ]);
      } finally {
        setLoading(false);
      }
    }
  };

  const waitForCompletion = async (runId) => {
    let status = "in_progress";
    while (status === "in_progress" || status === "queued") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${openAIKey}`,
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to check run status");
      const data = await response.json();
      status = data.status;
    }
  };

  const handleConnect = async () => {
    if (!openAIKey || !assistantId || !appName) {
      alert("Please fill in all fields before connecting.");
      return;
    }

    try {
      const threadResponse = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIKey}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
        },
      });

      if (!threadResponse.ok) {
        const errorData = await threadResponse.json();
        throw new Error(errorData.error.message || "Failed to create thread");
      }

      const threadData = await threadResponse.json();
      setThreadId(threadData.id);

      const assistantResponse = await fetch(
        `https://api.openai.com/v1/assistants/${assistantId}`,
        {
          headers: {
            Authorization: `Bearer ${openAIKey}`,
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );

      if (!assistantResponse.ok) {
        const errorData = await assistantResponse.json();
        throw new Error(errorData.error.message || "Failed to fetch assistant");
      }

      setConnected(true);
      setActiveMenu("chat");
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: "Connection successful!", sender: "system" },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: `Error: ${error.message}`, sender: "system" },
      ]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (message) => {
    if (message.sender === "assistant") {
      return message.text.split("\n").map((line, index) => (
        <p key={index} className="mb-2">
          {line.startsWith("•") ? <span className="ml-4">{line}</span> : line}
        </p>
      ));
    }
    return message.text;
  };

  const helpInstructions = [
    "Go to Open AI: https://openai.com/",
    "Create Account",
    "Create Project",
    "Create Assistant",
    "Provide Assistant details like name and instructions",
    "Attach any word or PDF document with question and answers or any document with details that user would like to talk to",
    "Copy the Assistant Key",
    "Create API Key",
    "Use the keys in the AI Chat Assistant by going to Settings page",
  ];

  return (
    <div className={`flex h-screen ${themes[theme].bg} ${themes[theme].text}`}>
      <div className={`w-64 ${themes[theme].sidebar} text-white`}>
        <div className="p-4">
          <h1 className="text-2xl font-bold font-roboto">{appName}</h1>
        </div>
        <nav className="mt-8">
          <button
            onClick={() => setActiveMenu("chat")}
            className={`w-full text-left p-4 hover:bg-opacity-75 ${
              activeMenu === "chat" ? "bg-opacity-75" : ""
            }`}
          >
            <i className="fas fa-comment-alt mr-2"></i> AI Chat Assistant
          </button>
          <button
            onClick={() => setActiveMenu("settings")}
            className={`w-full text-left p-4 hover:bg-opacity-75 ${
              activeMenu === "settings" ? "bg-opacity-75" : ""
            }`}
          >
            <i className="fas fa-cog mr-2"></i> Settings
          </button>
          <button
            onClick={() => setActiveMenu("help")}
            className={`w-full text-left p-4 hover:bg-opacity-75 ${
              activeMenu === "help" ? "bg-opacity-75" : ""
            }`}
          >
            <i className="fas fa-question-circle mr-2"></i> Help
          </button>
        </nav>
      </div>

      <div className="flex-1 flex flex-col">
        <div className={`${themes[theme].bg} shadow-md p-4`}>
          <h2 className="text-xl font-semibold font-roboto">
            {activeMenu === "chat"
              ? "AI Chat Assistant"
              : activeMenu === "settings"
              ? "Settings"
              : "Help"}
          </h2>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {activeMenu === "chat" && (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.sender === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <span
                    className={`inline-block p-2 rounded-lg ${
                      message.sender === "user"
                        ? "bg-blue-600 text-white"
                        : message.sender === "assistant"
                        ? "bg-gray-300 text-black"
                        : "bg-green-500 text-white"
                    }`}
                  >
                    {formatMessage(message)}
                  </span>
                </div>
              ))}
              {loading && (
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin"></i> Loading...
                </div>
              )}
            </>
          )}

          {activeMenu === "settings" && (
            <div className={`${themes[theme].bg} p-4 rounded-lg shadow`}>
              <input
                type="text"
                name="appName"
                placeholder="Application Name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className={`w-full p-2 mb-4 border rounded ${themes[theme].input}`}
                required
              />
              <input
                type="password"
                name="openAIKey"
                placeholder="OpenAI Key"
                value={openAIKey}
                onChange={(e) => setOpenAIKey(e.target.value)}
                className={`w-full p-2 mb-4 border rounded ${themes[theme].input}`}
                required
              />
              <input
                type="text"
                name="assistantId"
                placeholder="Assistant ID"
                value={assistantId}
                onChange={(e) => setAssistantId(e.target.value)}
                className={`w-full p-2 mb-4 border rounded ${themes[theme].input}`}
                required
              />
              <button
                onClick={handleConnect}
                className={`px-4 py-2 rounded hover:bg-opacity-90 ${themes[theme].button}`}
              >
                Connect
              </button>
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Themes</h3>
                <div className="flex space-x-1">
                  {Object.keys(themes).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`w-8 h-8 rounded-full ${themes[t].bg} ${
                        themes[t].text
                      } flex items-center justify-center border-2 ${
                        theme === t ? "border-blue-500" : "border-transparent"
                      }`}
                    >
                      <i
                        className={`fas fa-${
                          t === "light"
                            ? "sun"
                            : t === "dark"
                            ? "moon"
                            : t === "blue"
                            ? "water"
                            : "leaf"
                        }`}
                      ></i>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeMenu === "help" && (
            <div className={`${themes[theme].bg} p-4 rounded-lg shadow`}>
              <p className="mb-4">
                OpenAI Assistant Bot provides you interface to chat with your
                documents, this app uses OpenAI Assistant feature in the
                backend. Follow the below steps to get going.
              </p>
              <h3 className="text-lg font-semibold mb-4">
                Instructions for using the AI Chat Assistant
              </h3>
              <ul className="list-disc pl-6">
                {helpInstructions.map((instruction, index) => (
                  <li key={index} className="mb-2">
                    {index === 0 ? (
                      <React.Fragment>
                        Go to Open AI:{" "}
                        <a
                          href="https://openai.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          https://openai.com/
                        </a>
                      </React.Fragment>
                    ) : (
                      instruction
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {activeMenu === "chat" && (
          <div className={`p-4 ${themes[theme].bg}`}>
            <div className="flex">
              <input
                type="text"
                name="messageInput"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className={`flex-1 p-2 border rounded-l-lg ${themes[theme].input}`}
              />
              <button
                onClick={handleSendMessage}
                className={`p-2 rounded-r-lg w-32 flex items-center justify-center ${themes[theme].button}`}
                disabled={!connected || loading}
              >
                <i className="fas fa-paper-plane mr-2"></i> Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MainComponent;
