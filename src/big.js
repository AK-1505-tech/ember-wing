//Importing Icons
import memory from './assets/memory.svg';
import premium from './assets/premium.svg';
import account from './assets/account.svg';
import login from './assets/login.svg';
import logout from './assets/logout.svg';

//Importing Other Neccssary Modules
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

//Importing CSS
import './App.css';

function BigApp() {
  //Variable Declarations
  const navigate = useNavigate();
  const [mode, setMode] = useState('mode1');
  const [messages, setMsg] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const retryTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const aiRef = useRef(null);

  useEffect(() => {
    // Ollama runs locally at http://localhost:11434
    // Make sure Ollama is running: ollama pull gemma2:4b && ollama serve
    aiRef.current = 'http://localhost:11434'; // Ollama API endpoint
    console.log('Ollama endpoint set to:', aiRef.current);
    console.warn('Make sure Ollama is running: ollama pull gemma2:4b && ollama serve');

    return () => {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, []);

  function RadioO(props) {
    return (
      <li role='menuitem' className={props.styles}><input type='radio' name={props.name} id={props.value} value={props.value} checked={mode === props.value} onChange={() => { setMode(props.value); console.log('AI Mode = ', props.value); }} /><label htmlFor={props.value}>{props.text}</label></li>
    )
  }

  function BoxAI(props) {
    // Parse character tags [EMBER]text[/EMBER], bold **text**, and line breaks *
    const parseFormatting = (text) => {
      const parts = [];

      // First, split by single * for line breaks, but preserve ** for bold
      const lines = text.split(/(?<!\*)\*(?!\*)/);

      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
          // Add line break before each segment (except the first)
          parts.push(<br key={`br-${lineIndex}`} />);
        }

        // Now parse bold (**text**) and character tags within each line
        let lineContent = line;
        const lineElements = [];
        let lastIdx = 0;

        // Match bold text **...** and character tags
        const boldRegex = /\*\*(.*?)\*\*|\[(EMBER)\](.*?)\[\/\2\]/g;
        let match;

        while ((match = boldRegex.exec(lineContent)) !== null) {
          // Add text before match
          if (match.index > lastIdx) {
            lineElements.push(
              <span key={`text-${lastIdx}`}>{lineContent.substring(lastIdx, match.index)}</span>
            );
          }

          if (match[1] !== undefined) {
            // Bold text match - add line breaks before and after
            lineElements.push(<br key={`br-before-bold-${match.index}`} />);
            lineElements.push(
              <strong key={`bold-${match.index}`}>{match[1]}</strong>
            );
            lineElements.push(<br key={`br-after-bold-${match.index}`} />);
          } else if (match[2] !== undefined) {
            // Character tag match - add line breaks before and after
            lineElements.push(<br key={`br-before-${match.index}`} />);
            lineElements.push(
              <span key={`char-${match.index}`} className={`character character-${match[2].toLowerCase()}`}>
                {match[3]}
              </span>
            );
            lineElements.push(<br key={`br-after-${match.index}`} />);
          }

          lastIdx = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIdx < lineContent.length) {
          lineElements.push(
            <span key={`text-${lastIdx}`}>{lineContent.substring(lastIdx)}</span>
          );
        }

        // Add all line elements
        if (lineElements.length > 0) {
          parts.push(
            <span key={`line-${lineIndex}`}>{lineElements}</span>
          );
        }
      });

      return parts.length > 0 ? parts : text;
    };

    return (
      <div role='tooltip' style={{ width: 'max-content', alignSelf: 'flex-start', maxWidth: '50vw' }} className='is-top is-right' key={props.i}>
        {parseFormatting(props.text)}
      </div>
    )
  }

  function BoxUser(props) {
    return (
      <div role='tooltip' style={{ width: 'max-content', alignSelf: 'flex-end', maxWidth: '50vw' }} className='is-top is-left' key={props.i}>{props.text}</div>
    )
  }

  const askAI = async (event) => {
    if (event.key === 'Enter') {
      const userInput = input.trim();
      if (!userInput) return;

      // Block sends while thinking, retrying, or cooling down
      if (isThinking || retryCountdown > 0) return;
      if (cooldown > 0) {
        // brief, non-spammy feedback in chat
        setMsg(prev => [...prev, `⚠️ Please wait ${cooldown}s before sending another message.`]);
        return;
      }

      // Add the user's message first (keeps user/AI alternating order)
      setMsg(prev => [...prev, userInput]);
      setInput('');

      // start a short cooldown to prevent accidental repeated sends
      const cd = 3; // seconds
      setCooldown(cd);
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      cooldownTimerRef.current = setInterval(() => {
        setCooldown(c => {
          if (c <= 1) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
            return 0;
          }
          return c - 1;
        });
      }, 1000);

      const persona = "You are Ember Wing AI, an assistant created by a student from RIS International School Puthugramam. You do not know or ask for the student's personal name. Always be helpful and respectful.";
      const modeInstructions = mode === 'mode1'
        ? "Respond in a helpful neutral tone and answers should be short max 10 sentences"
        : mode === 'mode2'
          ? "Respond in a friendly, warm, and encouraging tone."
          : "Respond in a witty, clever, and concise tone and answers can be long.";

      const characterInfo = "You can wrap your response in character tags for styling. Use [EMBER]text[/EMBER] for Ember Wind AI (styled in cyan). Example: [EMBER]This is Ember speaking![/EMBER]";

      if (!aiRef.current) {
        setMsg(prev => [...prev, "⚠️ Ollama not configured. Make sure Ollama is running at http://localhost:11434 and pull the model: ollama pull gemma2:4b"]);
        return;
      }

      setIsThinking(true);

      const systemMessage = persona + " " + modeInstructions + " " + characterInfo;
      const payload = {
        model: "gemma3:4b",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userInput }
        ],
        temperature: 0.7
      };

      const maxAttempts = 3;
      let attempt = 0;
      let success = false;

      while (attempt < maxAttempts && !success) {
        try {
          const res = await fetch(aiRef.current + "/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const text = await res.text();
            console.log('Ollama raw response:', text);
            // Ollama streams responses as newline-delimited JSON
            const lines = text.trim().split('\n').filter(line => line.length > 0);

            // Add first chunk as a new message, then update it with each chunk
            let firstChunk = true;
            let fullReply = '';
            for (const line of lines) {
              try {
                const json = JSON.parse(line);
                if (json.message && json.message.content) {
                  fullReply += json.message.content;

                  // Display text as it arrives (streaming effect)
                  if (firstChunk) {
                    setMsg(prev => [...prev, fullReply]);
                    firstChunk = false;
                  } else {
                    // Update the last message (AI's response) with accumulated text
                    setMsg(prev => {
                      const updated = [...prev];
                      if (updated.length > 0) {
                        updated[updated.length - 1] = fullReply;
                      }
                      return updated;
                    });
                  }
                }
              } catch (e) {
                console.error('Failed to parse line:', line, e);
              }
            }
            console.log('Assembled reply:', fullReply);
            success = true;
            break;
          } else {
            // Handle connection errors or non-OK status
            const errText = await res.text();
            console.error(`Ollama error ${res.status}:`, errText);
            setMsg(prev => [...prev, `⚠️ Ollama error ${res.status}: ${errText.substring(0, 100)}`]);
            break;
          }
        } catch (err) {
          console.error('Network error:', err);
          // Network error: exponential backoff and retry
          const waitMs = 1000 * Math.pow(2, attempt);
          const waitSec = Math.ceil(waitMs / 1000);
          setMsg(prev => [...prev, `⚠️ Network error. Retrying in ${waitSec}s... (attempt ${attempt + 1}/${maxAttempts})`]);

          setRetryCountdown(waitSec);
          if (retryTimerRef.current) {
            clearInterval(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          retryTimerRef.current = setInterval(() => {
            setRetryCountdown(prev => {
              if (prev <= 1) {
                clearInterval(retryTimerRef.current);
                retryTimerRef.current = null;
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          await new Promise(r => setTimeout(r, waitMs));
          attempt += 1;
        }
      }

      if (!success && attempt >= maxAttempts) {
        setMsg(prev => [...prev, "⚠️ Failed to get a response from Ollama after multiple attempts. Make sure Ollama is running."]);
      }

      setIsThinking(false);
    }
  }

  return (
    <>
    <div id='chat-page'>
      <link rel="stylesheet" href="https://unpkg.com/7.css"></link>
      <div className='window active' style={{ width: '99.5vw', height: '99.5vh' }}>
        <div className='title-bar'>
          <div className='title-bar-text'>Ember Wing</div>
          <div className='title-bar-controls'>
            <button aria-label="Help" onClick={() => window.open('#about-me', '_self')}></button>
            <button aria-label='Minimize'></button>
            <button aria-label='Maximize'></button>
            <button aria-label='Close'></button>
          </div>
        </div>
        <ul role='menubar' className='can-hover'>
          <li role='menuitem' tabIndex='0' aria-haspopup='true'>
            Settings
            <ul role='menu'>
              <li role='menuitem' tabIndex='0' aria-haspopup='true'>
                <img src={memory} className='icon' />
                Select Mode:
                <ul role='menu'>
                  <RadioO name='mode' value='mode1' styles='' text='Normal' />
                  <RadioO name='mode' value='mode2' styles='' text='Friendly' />
                  <RadioO name='mode' value='mode3' styles='' text='Smarty' />
                </ul>
              </li>
              <li role='menuitem' aria-disabled='true'>
                <img src={premium} className='icon' />
                <a>Premium Access</a>
              </li>
            </ul>
          </li>
          <li role='menuitem' tabIndex='0' aria-haspopup='true'>
            Account
            <ul role='menu'>
              <li role='menuitem' aria-disabled='true'>
                <img src={account} className='icon' />
                <a>Register</a>
              </li>
              <li role='menuitem' aria-disabled='true'>
                <img src={login} className='icon' />
                <a>Log In</a>
              </li>
              <li role='menuitem' aria-disabled='true'>
                <img src={logout} className='icon' />
                <a>Log Out</a>
              </li>
            </ul>
          </li>
          <li role='menuitem' tabIndex='0'><a href='#about-me' className='abme'>About</a></li>
        </ul>
        <div className='window-body has-space' style={{ height: '89vh', marginTop: '1vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingRight: '8px', marginBottom: '10px' }}>
            {
              messages.map((msg, index) => (
                <>{index % 2 === 0 ? <BoxUser text={msg} i={index} /> : <BoxAI text={msg} i={index} />}</>
              ))
            }
          </div>
          <div className="group" style={{ position: 'absolute', bottom: '15px', width: '97vw' }}>
            <label htmlFor="UserIn">Type your message: </label>
            <input id="UserIn" type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={askAI} disabled={isThinking || retryCountdown > 0 || cooldown > 0}></input>
            {retryCountdown > 0 && <div style={{ marginTop: 6, color: '#b00' }}>Retrying in {retryCountdown}s...</div>}
            {cooldown > 0 && <div style={{ marginTop: 6, color: '#b00' }}>Please wait {cooldown}s before sending another message.</div>}
          </div>
        </div>
        <div className="window active is-bright" id="ai-thinking" role="dialog" aria-labelledby="dialog-title" style={{ visibility: isThinking ? 'visible' : 'hidden', opacity: isThinking ? '1' : '0' }}>
          <div className="title-bar">
            <div className="title-bar-text" id="dialog-title">Please Wait...</div>
            <div className="title-bar-controls" id='fl' style={{ display: 'none' }}>
              <button aria-label="Close" onClick={() => navigate(-1)}></button>
            </div>
          </div>
          <div className="window-body has-space">
            <h2 className="instruction instruction-primary">Ember Wing is thinking...</h2>
            <div role="progressbar" className="marquee"></div>
          </div>
        </div>
        <div style={{ width: '100vw', height: '100vh', position: 'absolute', backgroundColor: 'rgba(0,0,0,0.4)', top: 0, left: 0, display: isThinking ? 'block' : 'none' }}></div>
        <div className='window active is-bright' id='about-me' role='dialog' aria-labelledby='dialog-title' style={{ '--w7-w-bg': '#0fa' }}>
          <div className='title-bar'>
            <div className='title-bar-text' id='dialog-title'>Help OR About Me!!!</div>
            <div className='title-bar-controls'>
              <button aria-label='Close' onClick={() => navigate(-1)}></button>
            </div>
          </div>
          <div className='window-body has-space'>
            <h2 className='instruction instruction-primary'>About Me</h2>
            <p className='instruction'>Ember Wing v1.0.0</p>
            <p className='instruction'>Developed by Krish A.</p>
            <div className='instructions'>
              <p>    This is my first responsive site created with REACT.</p>
              <p>I have already created a resume page site.</p>
              <p>Here is link to that as well : <a href="https://dreamy-licorice-bf17a9.netlify.app/">My Resume</a></p>
            </div>
            <p className='instructions'>Hope You Like This Project!</p>
          </div>
          <footer style={{ textAlign: 'right' }}>
            <button onClick={() => navigate(-1)}>Okay!!!</button>
          </footer>
        </div>
      </div>
      </div>
    </>
  );
}

export default BigApp;
