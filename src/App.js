import React, { useState, useEffect, useRef } from "react";
import ReactDOM from 'react-dom';
import {
  AppBar, Toolbar, Typography, Box, Tabs, Tab, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Card, CardContent, CircularProgress,
  Alert, Fade, Backdrop
} from "@mui/material";
import useMediaQuery from '@mui/material/useMediaQuery';
import { SAMPLE_NEWS_LIST, LITERATURE_QUOTES, MUSICCAMP_QUOTES, ESSAY_TEXT, SONAGI_TEXT, WAYOFCODE_TEXT } from './data/sampleTexts.js';
import defaultPreset from './presets/defaultPreset';

const PopupCard = ({
  isOpen,
  isClosing,
  onClose,
  title,
  children,
  popupInitialX,
  popupInitialRotation,
  theme,
  isTabletPC,
  sx
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      const menu = document.getElementById('reusable-popup-card');
      if (menu && !menu.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen && !isClosing) {
    return null;
  }
  
  const cardContent = (
    <Box
      id="reusable-popup-card"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translate(-50%, 0)',
        width: isTabletPC ? '40%' : '80%',
        minHeight: '40vh',
        maxHeight: '60vh',
        bgcolor: theme.background,
        color: theme.text,
        borderRadius: '3px',
        boxShadow: `0px 0px 60px ${theme.text}50`,
        zIndex: 3000,
        p: 0,
        overflowY: 'auto',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        animationName: !isClosing ? 'slideIn' : 'slideOut',
        animationDuration: '.7s',
        animationFillMode: 'forwards',
        animationTimingFunction: 'ease',
        '@keyframes slideIn': {
          '0%': { transform: `translate(calc(-50% + ${popupInitialX}px), calc(100% + 80px)) rotate(${popupInitialRotation}deg)`, opacity: 1 },
          '100%': { transform: 'translate(-50%, 0) rotate(0deg)', opacity: 1 },
        },
        '@keyframes slideOut': {
          '0%': { transform: 'translate(-50%, 0) rotate(0deg)', visibility: 'visible', opacity: 1 },
          '99.9%': { transform: `translate(calc(-50% + ${popupInitialX}px), calc(100% + 80px)) rotate(${popupInitialRotation}deg)`, visibility: 'visible', opacity: 1 },
          '100%': { transform: `translate(calc(-50% + ${popupInitialX}px), calc(100% + 80px)) rotate(${popupInitialRotation}deg)`, visibility: 'hidden', opacity: 1 },
        },
        ...sx
      }}
      onClick={e => e.stopPropagation()}
    >
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 400, WebkitTextStroke: '0.03em', paintOrder: 'stroke fill', color: theme.text, px: 3, pt: 3, textAlign: 'left', textTransform: 'none' }}>
        {title}
      </Typography>
      {children}
    </Box>
  );

  return isOpen ? ReactDOM.createPortal(cardContent, document.body) : cardContent;
};

export default function App() {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [model, setModel] = useState("sona_speech_1");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [titleLoading, setTitleLoading] = useState(false);
  const [takes, setTakes] = useState([]);
  const [currentTake, setCurrentTake] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioState, setCurrentAudioState] = useState(null);
  const currentAudio = useRef(null);
  const audioBufferRef = useRef({});
  const [generatingTake, setGeneratingTake] = useState(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const takesRef = useRef([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [takeFontSize, setTakeFontSize] = useState(16);
  // 화면이 가로로 긴 경우(landscape) 또는 큰 화면인 경우를 태블릿/PC로 간주
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const isTabletPC = isLargeScreen || isLandscape;
  // containerWidth, lineHeight는 프리셋에서 관리
  const [darkMode, setDarkMode] = useState(false);
  const takesContainerRef = useRef(null);
  const [uiHidden, setUiHidden] = useState(false);
  const [fontFamilyIndex, setFontFamilyIndex] = useState(0);
  const [showGptGuide, setShowGptGuide] = useState(false);
  const [isGptGuideClosing, setIsGptGuideClosing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseDotStep, setPauseDotStep] = useState(0);
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [popupInitialRotation, setPopupInitialRotation] = useState(0);
  const [popupInitialX, setPopupInitialX] = useState(0);
  const [customVoiceId, setCustomVoiceId] = useState('');
  const [showFontName, setShowFontName] = useState(false);
  const [fontNameKey, setFontNameKey] = useState(0);
  const fontNameTimeoutRef = useRef();
  const [diceIndex, setDiceIndex] = useState(0);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const diceIntervalRef = useRef(null);
  const ttsAbortControllerRef = useRef(null);
  const isUnloadingRef = useRef(false);
  // iOS 오디오 정책 우회용: 최초 1회 무음 재생
  const mutePlayedRef = useRef(false);
  // 최신 isPaused 값을 참조하기 위한 ref
  const isPausedRef = useRef(isPaused);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  // 프리셋 상태 관리
  const [preset, setPreset] = useState(() => {
    try {
      const saved = localStorage.getItem('audiobook-preset');
      return saved ? JSON.parse(saved) : defaultPreset;
    } catch {
      return defaultPreset;
    }
  });
  // 프리셋 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('audiobook-preset', JSON.stringify(preset));
    } catch {}
  }, [preset]);

  const iconButtonStyle = {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
    '&:active': {
      backgroundColor: 'rgba(139, 69, 19, 0.1)',
    },
    WebkitTapHighlightColor: 'transparent',
  };

  // 제목 효과용 랜덤 인덱스
  const TITLE_TEXT = "읽는 사람";
  const titleChars = TITLE_TEXT.split('');
  const nonSpaceIndexes = titleChars
    .map((char, idx) => (char !== ' ' ? idx : null))
    .filter(idx => idx !== null);

  const [randomTitleIndex, setRandomTitleIndex] = useState(() =>
    Math.random() < 0.2 ? nonSpaceIndexes[Math.floor(Math.random() * nonSpaceIndexes.length)] : -1
  );

  useEffect(() => {
    setRandomTitleIndex(
      Math.random() < 0.2 ? nonSpaceIndexes[Math.floor(Math.random() * nonSpaceIndexes.length)] : -1
    );
  }, []);

  // 화면 방향/크기 변경 시 문단폭을 프리셋에서 가져와 적용
  const getContainerWidth = () => {
    if (preset.containerWidth) {
      return isTabletPC ? (preset.containerWidth.pc ?? 0.45) : (preset.containerWidth.mobile ?? 0.8);
    }
    return isTabletPC ? 0.45 : 0.8;
  };
  const containerWidth = getContainerWidth();

  // Voice ID 유효성 검사 함수
  const validateVoiceId = (text) => {
    // 22자 정확히
    if (text.length !== 22) {
      return { isValid: false, message: "Voice ID는 반드시 22자여야 합니다." };
    }
    // 100자 미만 (이제 불필요하지만 혹시 몰라 남김)
    if (text.length >= 100) {
      return { isValid: false, message: "Voice ID는 100자 미만이어야 합니다." };
    }
    // 영문 대소문자와 숫자로만 구성
    if (!/^[a-zA-Z0-9]+$/.test(text)) {
      return { isValid: false, message: "Voice ID는 영문자와 숫자로만 구성되어야 합니다." };
    }
    // 공백이나 줄바꿈 없는 한 줄 문장
    if (/\s/.test(text)) {
      return { isValid: false, message: "Voice ID에는 공백이나 줄바꿈이 포함될 수 없습니다." };
    }
    return { isValid: true };
  };

  const VOICES = [
    { name: '루시안 프로이드', id: 'hQqi26RFdZ59x3bGR2Bnoj', description: '는 고독과 친밀한 화가였어요. 조용하지만 단단한 목소리로 마음을 전했죠. 한때, 프랜시스 베이컨의 절친이었다지요.' },
    { name: '귀찮은 고양이', id: 'ad67887f07639d2973f48a', description: '를 소개하는 건 정말 너무 귀찮네요.' },
    { name: '책뚫남', id: 'a213ca3c004c21da52d35d', description: '이 읽어 주는 책은 멈출 수 없어요. 잠들기 전 옆에서 책 읽어 주었으면 하는 사람 콘테스트에서 우승했거든요.' },
    { name: '제너레이션 MG', id: '4404f9613ff506ebd6daee', description: '는 부장님을 이해할 수 없어요. 부장님도 그녀를 이해할 수 없지요. 그러면 어때요? 젊고 쿨한걸요.' },
    { name: '차분한 그녀', id: '26dbddbce9113c14a6822c', description: '는 글을 읽으며 꾸미지 않아요. 가끔은 읽던 곳을 놓치기도 하지만, 그러면 어때요. 친근한걸요.' },
    { name: '미술관 도슨트', id: '0f7ccb849f108608620302', description: '는 예술과 당신 사이의 안내자예요. 자연과 예술, 시간과 사유를 연결하는 자리에 늘 함께 있어요.' },
    { name: '박물관 사서', id: 'eb5e0f9308248300915305', description: '눈에 띄지 않게 조용히 책 사이를 오가며, 누군가의 하루에 맞는 문장을 골라줘요.' },
    { name: '진지한 케일리', id: 'weKbNjMh2V5MuXziwHwjoT', description: '는 회사 스튜디오에서 우연히 목소리를 녹음 했어요. 연기엔 자신 있었다지만 누가 봐도 또박또박 읽고 있지요.' },
    { name: '릭 루빈', id: 'nNkPFG9fioPzmsxGpawKbv', description: '은 화려한 테크닉보다 감각과 직관을 믿는 사람이에요. 명상으로 마음을 비우고, 음악의 본질만을 담아내는 전설적인 프로듀서죠.' },
    { name: '이석원', id: '6ay4URFxK9bry6z7zMDBLP', description: '은 말보다 침묵에 가까운 사람이지요. 그의 시선엔 쓸쓸함과 따뜻함이 함께 있고, 목소리는 그의 노래처럼 차분하고 조용하지만 오래 남거든요.' },
    { name: '출판사 『무제』 사장', id: 'k3nWGietavXL1CA7oksXZ9', description: '은 베일에 싸여 있어요. 배우라는 설도 있지만 낭설일 뿐이지요. 『쓸 만한 인간』이라는 말도 들어요.' },
    { name: '송골매 기타리스트', id: '9BxbNLZ349CPuYpLUmBDYa', description: '가 누구인지 아는사람들 모여라~! 세상만사 모든일이 뜻대로야 되겠소만 어쩌다 마주친 그대처럼 우리 모두 다 사랑하리~' },
  ];
  // selectedVoice는 프리셋의 voice(name)와 동기화
  const [selectedVoice, setSelectedVoice] = useState(() => {
    const found = VOICES.find(v => v.name === (defaultPreset.voice || '책뚫남'));
    return found || VOICES[0];
  });
  // 프리셋의 voice가 바뀌면 selectedVoice도 동기화
  useEffect(() => {
    const found = VOICES.find(v => v.name === preset.voice);
    if (found && found !== selectedVoice) setSelectedVoice(found);
  }, [preset.voice]);

  const lightTheme = {
    background: '#dcdcdc',
    text: '#1d1d1d',
    card: '#fff',
    accent: '#1976d2',
    border: '#bbb',
  };
  const darkTheme = {
    background: '#000000',
    text: '#aaaaaa',
    card: '#2d313a',
    accent: '#90caf9',
    border: '#444',
  };
  const theme = preset.darkMode ? darkTheme : lightTheme;

  const fontFamilies = [
    'var(--font-mysteria)', // 지백체
    'var(--font-type32)',   // 서른둘체
    'var(--font-serif)',    // 을유1945체
    'var(--font-roehoe)',   // 노회찬체
    'var(--font-exqt)',     // exqt체
    'var(--font-sam3kr)',   // 삼국지3체
    'var(--font-system)'    // 시스템기본서체
  ];

  const selectedVoiceRef = useRef(selectedVoice);
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);

  const handleGenerate = () => {
    setLoading(true);
    // TODO: API 연동
    setTimeout(() => {
      setAudioUrl("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
      setLoading(false);
    }, 2000);
  };

  // useEffect(() => {
  //   async function checkClipboardForUrl() {
  //     try {
  //       const text = await navigator.clipboard.readText();
  //       if (/^https?:\/\//.test(text)) {
  //         setUrl(text);
  //       } else if (text && text.length > 0) {
  //         setText(text);
  //       }
  //     } catch (e) {}
  //   }
  //   checkClipboardForUrl();
  // }, []);

  // 제목 생성: 최초 소리내어 읽기 버튼을 누를 때만, title이 비어있을 때만 fetch
  const generateTitleIfNeeded = async () => {
    if (!title && text) {
      // MATERIALS에서 텍스트가 포함된 항목 찾기
      const matchedMaterial = Object.values(MATERIALS).find(material => material.list && material.list.includes(text));
      if (matchedMaterial) {
        setTitle(matchedMaterial.name);
        return;
      }
    setTitleLoading(true);
      setTitle("제목을 고민하는 중");
      try {
        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/generate-title`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        let cleanTitle = data.title || '';
        cleanTitle = cleanTitle.replace(/^[*#\s]+|[*#\s]+$/g, '').trim();
        cleanTitle = cleanTitle.replace(/["'「」«»()`]/g, '');
        cleanTitle = cleanTitle.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
        setTitle(cleanTitle);
      } catch {
        setTitle("제목 생성 실패");
      } finally {
        setTitleLoading(false);
      }
    }
  };

  // 텍스트를 200자 단위로 나누는 함수
  const splitTextIntoTakes = (text) => {
    const maxLength = 200;
    const takes = [];
    let takeNumber = 1;

    // 1차 분할: 공백/탭만 있는 줄이 2번 이상 연속될 때마다 분할
    const blocks = text.split(/(?:[ \t]*\r?\n){2,}/);

    for (let block of blocks) {
      let remainingText = block.trim();
      // 빈 블록도 테이크로 추가
      if (remainingText.length === 0) {
        takes.push({
          text: '',
          displayText: '',
          name: `Take_${takeNumber}`
        });
        takeNumber++;
        continue;
      }
      while (remainingText.length > 0) {
        if (remainingText.length <= maxLength) {
          takes.push({
            text: remainingText,
            displayText: convertTextForDisplay(remainingText),
            name: `Take_${takeNumber}`
          });
          break;
        }
        // 기존 로직: 마침표, 느낌표, 물음표, 물결(~) 우선, 없으면 공백
        let cutIndex = maxLength;
        const lastPeriod = remainingText.lastIndexOf('.', maxLength);
        const lastExclam = remainingText.lastIndexOf('!', maxLength);
        const lastQuestion = remainingText.lastIndexOf('?', maxLength);
        const lastTilde = remainingText.lastIndexOf('~', maxLength);
        const lastSpace = remainingText.lastIndexOf(' ', maxLength);
        const candidates = [lastPeriod, lastExclam, lastQuestion, lastTilde].filter(idx => idx > 0);
        if (candidates.length > 0) {
          cutIndex = Math.max(...candidates) + 1;
        } else if (lastSpace > 0) {
          cutIndex = lastSpace;
        }
        const takeText = remainingText.slice(0, cutIndex).trim();
        takes.push({
          text: takeText,
          displayText: convertTextForDisplay(takeText),
          name: `Take_${takeNumber}`
        });
        remainingText = remainingText.slice(cutIndex).trim();
        takeNumber++;
      }
      takeNumber++;
    }
    return takes;
  };

  // AAA::BBB::CCC 형식을 파싱하는 함수
  const parseSpecialFormat = (text) => {
    // 정확히 두 개의 ::가 있는 패턴을 찾는 정규식
    // AAA::BBB::CCC, AAA::BBB::, 또는 :::: 형식 모두 처리
    const specialFormatRegex = /([^::\s]*::[^::\s]*::)/g;
    const matches = [];
    let match;
    
    console.log('파싱 시작 - 텍스트:', text);
    
    while ((match = specialFormatRegex.exec(text)) !== null) {
      const fullMatch = match[1];
      const parts = fullMatch.split('::');
      console.log('찾은 매치:', fullMatch, '파트:', parts);
      
      if (parts.length === 3) {
        matches.push({
          full: fullMatch,
          aaa: parts[0] || '', // AAA가 없으면 빈 문자열
          bbb: parts[1] || '', // BBB가 없으면 빈 문자열
          ccc: parts[2] || '', // CCC가 없으면 빈 문자열
          startIndex: match.index,
          endIndex: match.index + fullMatch.length
        });
      }
    }
    
    console.log('최종 매치 결과:', matches);
    return matches;
  };

  // API 호출용 텍스트 변환 (AAA를 BBB로 대체)
  const convertTextForAPI = (text) => {
    const matches = parseSpecialFormat(text);
    console.log('API 변환 - 원본 텍스트:', text);
    console.log('API 변환 - 찾은 매치:', matches);
    
    let result = text;
    
    // 뒤에서부터 변환하여 인덱스 변화를 방지
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const replacement = match.bbb + match.ccc;
      console.log(`API 변환 - ${match.full} -> ${replacement}`);
      console.log(`API 변환 - 인덱스: ${match.startIndex} ~ ${match.endIndex}`);
      console.log(`API 변환 - 변환 전: "${result}"`);
      result = result.slice(0, match.startIndex) + replacement + result.slice(match.endIndex);
      console.log(`API 변환 - 변환 후: "${result}"`);
    }
    
    console.log('API 변환 - 최종 결과:', result);
    return result;
  };

  // 화면 표시용 텍스트 변환 (AAA 그대로 유지)
  const convertTextForDisplay = (text) => {
    const matches = parseSpecialFormat(text);
    console.log('화면 변환 - 원본 텍스트:', text);
    console.log('화면 변환 - 찾은 매치:', matches);
    
    let result = text;
    
    // 뒤에서부터 변환하여 인덱스 변화를 방지
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const replacement = match.aaa + match.ccc;
      console.log(`화면 변환 - ${match.full} -> ${replacement}`);
      result = result.slice(0, match.startIndex) + replacement + result.slice(match.endIndex);
    }
    
    console.log('화면 변환 - 결과:', result);
    return result;
  };

  // 텍스트를 단어 단위로 분할(문장기호는 인접 단어와 합침, 가중치 부여)
  const splitIntoWords = (text) => {
    // text가 문자열이 아닌 경우 빈 배열 반환
    if (typeof text !== 'string') {
      console.warn('splitIntoWords: text is not a string:', text);
      return [];
    }
    // 단어+문장기호를 하나의 토큰으로 합침
    const wordRegex = /[^\s.,!?]+[.,!?]?|[.,!?]/g;
    const rawWords = text.match(wordRegex) || [];
    
    // 가중치 부여: .은 0.75초(11자), ,?!는 0.5초(7자)
    return rawWords.map((word, idx) => {
      let weight = word.replace(/[.,!?]/g, '').length;
      if (word.endsWith('.')) weight += 11;
      else if (/[,!?]$/.test(word)) weight += 7;
      return {
        word,
        weight,
        isEndOfSentence: /[.,!?]$/.test(word)
      };
    });
  };

  // 현재 재생 시간에 따라 강조할 단어 인덱스를 계산하는 함수
  const calculateCurrentWordIndex = (currentTime, duration, take) => {
    if (!duration || !take) return 0;
    
    // 화면 표시용 텍스트로 단어 분할
    const displayText = take.displayText || convertTextForDisplay(take.text);
    const words = splitIntoWords(displayText);
    
    if (!words.length) return 0;
    
    const totalDuration = duration + 1;
    const totalWeight = words.reduce((sum, word) => sum + word.weight, 0);
    const timePerWeight = totalWeight > 0 ? totalDuration / totalWeight : 0;
    
    let accumulatedTime = 0;
    for (let i = 0; i < words.length; i++) {
      const wordDuration = words[i].weight * timePerWeight;
      accumulatedTime += wordDuration;
      if (currentTime < accumulatedTime) {
        return i;
      }
    }
    
    return Math.max(0, words.length - 1);
  };

  // 강조 표시된 텍스트를 렌더링하는 컴포넌트(항상 동일한 기준)
  const HighlightedText = ({ text, currentIndex, fontSize, isCurrentTake }) => {
    // text가 문자열인지 객체인지 확인하고 안전하게 처리
    let displayText;
    if (typeof text === 'string') {
      displayText = convertTextForDisplay(text);
    } else if (text && typeof text === 'object' && text.displayText) {
      displayText = text.displayText;
    } else if (text && typeof text === 'object' && text.text) {
      displayText = convertTextForDisplay(text.text);
    } else {
      console.warn('HighlightedText: invalid text prop:', text);
      displayText = '';
    }
    const words = splitIntoWords(displayText);
    const isDark = preset.darkMode;
    const effectiveFontSize = isTabletPC ? fontSize * 1.1 : fontSize;
    return (
      <span style={{
        position: 'relative',
        fontFamily: fontFamilies[fontFamilyIndex],
        fontSize: effectiveFontSize,
        color: isDark ? '#aaaaaa' : '#1d1d1d',
        lineHeight: preset.lineHeight[isTabletPC ? 'pc' : 'mobile'],
        wordBreak: 'break-all',
        whiteSpace: 'pre-wrap',
        display: 'block',
      }}>
        {isCurrentTake && (
          <span style={{
            position: 'absolute',
            left: 'calc(-1.2em + 7px)',
            top: '-11px',
            color: 'rgba(139,69,19,0.8)',
          }}>
            •
          </span>
        )}
        {words.map((wordObj, index) => (
          <React.Fragment key={index}>
            <span
              style={{
                textDecoration: index === currentIndex ? 'underline' : 'none',
                textUnderlinePosition: 'under',
                textDecorationColor: index === currentIndex ? 'rgba(139,69,19,0.8)' : undefined,
                textUnderlineOffset: index === currentIndex ? '5%' : undefined,
                transition: 'all 0.3s',
                padding: 0,
                marginRight: 'auto',
                borderRadius: '2px',
              }}
            >
              {wordObj.word}
            </span>
            {/* 단어 사이에 일반 공백 */}
            {index !== words.length - 1 && ' '}
          </React.Fragment>
        ))}
      </span>
    );
  };

  // TTS 변환 함수 - 오디오 URL만 생성
  const convertToSpeech = async (take, voiceId, signal) => {
    const useVoiceId = voiceId || (selectedVoiceRef.current && selectedVoiceRef.current.id) || VOICES[0].id;
    try {
      console.log(`Converting Take: ${take.name}`);
      // API 호출용 텍스트로 변환 (AAA::BBB::CCC 형식 처리)
      const apiText = convertTextForAPI(take.text);
      console.log(`Original text: ${take.text}`);
      console.log(`API text: ${apiText}`);
      
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: apiText, voice_id: useVoiceId }),
        signal
      });
      
      if (!response.ok) throw new Error(`TTS 변환 실패: ${response.status}`);
      const audioData = await response.arrayBuffer();
      console.log(`Received audio data size: ${audioData.byteLength} bytes`);
      const blob = new Blob([audioData], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      console.log(`Created audio URL: ${url}`);
      return url;
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('TTS fetch aborted.');
      } else {
        console.error("TTS 변환 실패:", e);
      }
      throw e;
    }
  };

  // 다음 Take 미리 생성
  const prepareNextTake = async (nextIndex, voiceId, signal) => {
    const useVoiceId = voiceId || (selectedVoiceRef.current && selectedVoiceRef.current.id) || VOICES[0].id;
    if (nextIndex >= takesRef.current.length || audioBufferRef.current[nextIndex]) {
      console.log(`Skip preparing take ${nextIndex}: ${nextIndex >= takesRef.current.length ? 'end of takes' : 'already in buffer'}`);
      return;
    }
    try {
      console.log(`Preparing take ${nextIndex}`);
      setFadeIn(true);
      setGeneratingTake(nextIndex);
      const audioUrl = await convertToSpeech(takesRef.current[nextIndex], useVoiceId, signal);
      console.log(`Successfully prepared take ${nextIndex}, URL: ${audioUrl}`);
      audioBufferRef.current[nextIndex] = audioUrl;
      // 생성 완료 시 애니메이션 중지 (현재 생성중인 테이크가 지금 끝난 테이크와 같다면)
      setGeneratingTake(currentGeneratingTake => {
        if (currentGeneratingTake === nextIndex) {
          return null; // 애니메이션 중지
        }
        return currentGeneratingTake; // 다른 테이크가 생성 중이면 그대로 둠
      });
      // 오디오 생성 완료 시점에 자동재생 대기 플래그 확인
      if (autoPlayPendingIndexRef.current === nextIndex) {
        playTake(nextIndex, signal);
        setAutoPlayPending(null);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error(`Take ${nextIndex} 생성 실패:`, e);
        // 생성 실패 시 애니메이션 중지
        setGeneratingTake(currentGeneratingTake => {
          if (currentGeneratingTake === nextIndex) {
            return null;
          }
          return currentGeneratingTake;
        });
      }
    }
  };

  // takes 상태가 바뀔 때마다 ref도 동기화
  useEffect(() => {
    takesRef.current = takes;
  }, [takes]);

  // handleTTS 함수 개선: 첫 번째 Take 오디오가 준비된 후에만 playTake(0) 호출
  const handleTTS = async () => {
    // 최초 재생 시에만 최상단으로 스크롤
    if (!isPlaying && !isPaused) {
      window.scrollTo({ top: 0, behavior: 'smooth' }); // 버튼 클릭 시 바로 스크롤
    }
    if (!text) return;
    if (isPlaying && !isPaused) {
      if (currentAudio.current) {
        currentAudio.current.pause();
        setIsPaused(true);
        setIsPlaying(false);
      }
      return;
    }
    if (isPaused && currentAudio.current) {
      // play()가 실패해도(오디오 준비 안됨 등) 에러 무시
      currentAudio.current.play().catch(() => {});
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    // iOS 첫 재생 우회: mute.wav 재생 (최초 1회만, 동기화 보장)
    if (!mutePlayedRef.current && currentAudio.current) {
      try {
        currentAudio.current.src = '/mute.wav';
        await currentAudio.current.play(); // play가 끝나야만 다음 단계로
        currentAudio.current.pause();
        currentAudio.current.src = '';
        mutePlayedRef.current = true;
      } catch (e) {
        // 무음 재생 실패해도 무시
      }
    }
    // 이제 TTS 오디오 생성 및 재생 로직 시작
    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
    }
    const newAbortController = new AbortController();
    ttsAbortControllerRef.current = newAbortController;
    const { signal } = newAbortController;

    await generateTitleIfNeeded();
    setUiHidden(true);
    setLoading(true);
    setIsPlaying(true);
    setIsPaused(false);
    try {
      const textTakes = splitTextIntoTakes(text);
      setTakes(textTakes);
      takesRef.current = textTakes;
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 150); // UI 전환 후 스크롤
      setFadeIn(true);
      setGeneratingTake(0);
      const firstTakeUrl = await convertToSpeech(textTakes[0], null, signal);
      audioBufferRef.current = { 0: firstTakeUrl };
      if (textTakes.length > 1) {
        prepareNextTake(1, null, signal);
      }
      playTake(0);
    } catch (e) {
      if (isUnloadingRef.current) {
        console.log('TTS generation aborted due to page unload.');
        return;
      }
      if (e.name === 'AbortError') {
        console.log('TTS generation aborted.');
        return; // 그냥 종료. 새로운 요청이 처리될 것임.
      }
      alert("음성 변환에 실패했습니다.");
      setCustomVoiceId('');
      // stopPlaying() 대신 아래만 실행
      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current.currentTime = 0;
        currentAudio.current.src = '';
        currentAudio.current.onended = null;
        currentAudio.current.onplay = null;
        currentAudio.current.ontimeupdate = null;
      }
      setVoiceMenuOpen(true);
    }
  };

  // 현재 테이크 스크롤 (플로팅 버튼 높이 고려)
  const handleScrollCurrentTake = () => {
    setTimeout(() => {
      const el = document.querySelector('.current-take');
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const floatingHeight = 56; // 플로팅 버튼 높이(px)
        // 테이크가 화면 밖에 있을 때만 스크롤
        if (rect.top < 0 || rect.bottom > (vh - floatingHeight)) {
          const scrollTop = window.pageYOffset + rect.top - 50;
          window.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }
    }, 0);
  };

  // playTake에서 takesRef.current 사용
  const playTake = (takeIndex, signal) => {
    if (takeIndex >= takesRef.current.length) {
      console.log('Reached end of takes, stopping playback');
      setIsPlaying(false);
      setCurrentTake(0);
      setCurrentWordIndex(0);
      setIsAudioPlaying(false);
      setLoading(false);
      setGeneratingTake(null);
      Object.values(audioBufferRef.current).forEach(url => {
        console.log(`Cleaning up URL: ${url}`);
        URL.revokeObjectURL(url);
      });
      audioBufferRef.current = {};
      // 마지막 테이크까지 다 읽었으면 주사위 버튼이 보이는 가장 아래로 스크롤
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 300);
      return;
    }
    const audioUrl = audioBufferRef.current[takeIndex];
    if (!audioUrl) {
      setAutoPlayPending(takeIndex);
      return;
    }
    console.log(`Playing take ${takeIndex}, URL: ${audioUrl}`);
    try {
      // === 변경: Audio 객체를 재사용 ===
      let audio = currentAudio.current;
      if (!audio) {
        audio = new Audio();
        currentAudio.current = audio;
      } else {
        audio.pause();
        audio.currentTime = 0;
        audio.onended = null;
        audio.onplay = null;
        audio.ontimeupdate = null;
        audio.onerror = null;
        // src를 바꾸기 전에 srcObject도 null로
        audio.srcObject = null;
      }
      audio.onerror = (e) => {
        console.error(`Audio error for take ${takeIndex}:`, e);
      };
      audio.ontimeupdate = () => {
        if (!takesRef.current || !takesRef.current[takeIndex]) {
          console.warn('Take not available for index:', takeIndex);
          return;
        }
        const newIndex = calculateCurrentWordIndex(audio.currentTime, audio.duration, takesRef.current[takeIndex]);
        if (newIndex !== currentWordIndex) {
          setCurrentWordIndex(newIndex);
        }
      };
      audio.oncanplay = () => {
        console.log(`Take ${takeIndex} is ready to play`);
        setCurrentWordIndex(0);
      };
      audio.onplay = () => {
        console.log(`Take ${takeIndex} started playing`);
        setCurrentTake(takeIndex);
        setIsAudioPlaying(true);
        setGeneratingTake(currentGenerating =>
          currentGenerating === takeIndex ? null : currentGenerating
        );
        setTimeout(() => {
          handleScrollCurrentTake();
        }, 200);
      };
      audio.onpause = () => {
        setIsAudioPlaying(false);
        setCurrentWordIndex(-1);
      };
      audio.onended = () => {
        console.log(`Take ${takeIndex} finished playing`);
        setIsAudioPlaying(false);
        setCurrentWordIndex(-1);
        URL.revokeObjectURL(audioBufferRef.current[takeIndex]);
        delete audioBufferRef.current[takeIndex];
        const { signal } = ttsAbortControllerRef.current || { signal: undefined };
        setTimeout(() => playTake(takeIndex + 1, signal), 1000);
      };
      setCurrentAudioState(audio);
      audio.src = audioUrl;
      audio.load();
      if (!isPausedRef.current) {
        audio.play()
          .then(() => {
            console.log(`Successfully started playing take ${takeIndex}`);
            if (takeIndex < takesRef.current.length - 1) {
              const { signal } = ttsAbortControllerRef.current || { signal: undefined };
              prepareNextTake(takeIndex + 1, null, signal);
            }
          })
          .catch(error => {
            console.error(`Error playing take ${takeIndex}:`, error);
          });
      }
    } catch (e) {
      console.error(`Error setting up audio for take ${takeIndex}:`, e);
    }
  };

  // 재생 중지 함수 개선: currentAudio 완전 해제
  const stopPlaying = () => {
    console.log('Stopping playback');

    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
      ttsAbortControllerRef.current = null;
    }

    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
      currentAudio.current.src = '';
      currentAudio.current.onended = null;
      currentAudio.current.onplay = null;
      currentAudio.current.ontimeupdate = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTake(0);
    setCurrentWordIndex(0);
    setIsAudioPlaying(false);
    setLoading(false);
    setGeneratingTake(null);
    Object.values(audioBufferRef.current).forEach(url => {
      console.log(`Cleaning up URL: ${url}`);
      URL.revokeObjectURL(url);
    });
    audioBufferRef.current = {};
  };

  // 준비중인 Take 깜빡임 애니메이션
  useEffect(() => {
    if (generatingTake !== null) {
      const interval = setInterval(() => setFadeIn(f => !f), 1000);
      return () => clearInterval(interval);
    }
  }, [generatingTake]);

  // 특정 테이크부터 재생하는 함수 개선: setTimeout 없이 바로 재생
  const handlePlayFromTake = async (startIndex, voiceId) => {
    stopPlaying();
    setCurrentTake(startIndex);
    handleScrollCurrentTake();

    const newAbortController = new AbortController();
    ttsAbortControllerRef.current = newAbortController;
    const { signal } = newAbortController;

    setLoading(true);
    setIsPlaying(true);
    const useVoiceId = voiceId || (selectedVoiceRef.current && selectedVoiceRef.current.id) || VOICES[0].id;
    try {
      setFadeIn(true);
      setGeneratingTake(startIndex);
      const url = await convertToSpeech(takesRef.current[startIndex], useVoiceId, signal);
      audioBufferRef.current = { [startIndex]: url };
      if (startIndex < takesRef.current.length - 1) {
        prepareNextTake(startIndex + 1, useVoiceId, signal);
      }
      playTake(startIndex);
    } catch (e) {
      if (isUnloadingRef.current) {
        console.log('TTS generation from take aborted due to page unload.');
        return;
      }
      if (e.name === 'AbortError') {
        console.log('TTS generation from take aborted.');
        return;
      }
      console.error("재생 시작 실패:", e);
      alert("음성 변환에 실패했습니다.");
      setCustomVoiceId('');
      // stopPlaying() 대신 아래만 실행
      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current.currentTime = 0;
        currentAudio.current.src = '';
        currentAudio.current.onended = null;
        currentAudio.current.onplay = null;
        currentAudio.current.ontimeupdate = null;
      }
      setVoiceMenuOpen(true);
    }
  };

  // 최상단 스크롤
  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 폰트 크기 조절
  const handleFontSizeUp = () => setPreset(p => {
    const key = isTabletPC ? 'pc' : 'mobile';
    const cur = (typeof p.fontSize === 'object' ? p.fontSize[key] : p.fontSize) ?? 15;
    return {
      ...p,
      fontSize: {
        ...(typeof p.fontSize === 'object' ? p.fontSize : { mobile: p.fontSize ?? 15, pc: p.fontSize ?? 15 }),
        [key]: Math.min(cur + 1, 64)
      }
    };
  });
  const handleFontSizeDown = () => setPreset(p => {
    const key = isTabletPC ? 'pc' : 'mobile';
    const cur = (typeof p.fontSize === 'object' ? p.fontSize[key] : p.fontSize) ?? 15;
    return {
      ...p,
      fontSize: {
        ...(typeof p.fontSize === 'object' ? p.fontSize : { mobile: p.fontSize ?? 15, pc: p.fontSize ?? 15 }),
        [key]: Math.max(cur - 1, 8)
      }
    };
  });

  // 폭 조절
  const handleWidthUp = () => setPreset(p => {
    const key = isTabletPC ? 'pc' : 'mobile';
    const cur = p.containerWidth?.[key] ?? (isTabletPC ? 0.45 : 0.8);
    return {
      ...p,
      containerWidth: {
        ...p.containerWidth,
        [key]: Math.min(cur + 0.05, 0.9)
      }
    };
  });
  const handleWidthDown = () => setPreset(p => {
    const key = isTabletPC ? 'pc' : 'mobile';
    const cur = p.containerWidth?.[key] ?? (isTabletPC ? 0.45 : 0.8);
    return {
      ...p,
      containerWidth: {
        ...p.containerWidth,
        [key]: Math.max(cur - 0.05, 0.3)
      }
    };
  });

  // 다크모드 토글
  const handleToggleDark = () => setPreset(p => ({ ...p, darkMode: !p.darkMode }));

  // 테이크 텍스트 줄간격 상태
  const handleLineHeightUp = () => setPreset(p => {
    const key = isTabletPC ? 'pc' : 'mobile';
    const cur = (typeof p.lineHeight === 'object' ? p.lineHeight[key] : p.lineHeight) ?? 1.7;
    return {
      ...p,
      lineHeight: {
        ...(typeof p.lineHeight === 'object' ? p.lineHeight : { mobile: p.lineHeight ?? 1.7, pc: p.lineHeight ?? 1.7 }),
        [key]: Math.max(cur - 0.1, 1)
      }
    };
  });
  const handleLineHeightDown = () => setPreset(p => {
    const key = isTabletPC ? 'pc' : 'mobile';
    const cur = (typeof p.lineHeight === 'object' ? p.lineHeight[key] : p.lineHeight) ?? 1.7;
    return {
      ...p,
      lineHeight: {
        ...(typeof p.lineHeight === 'object' ? p.lineHeight : { mobile: p.lineHeight ?? 1.7, pc: p.lineHeight ?? 1.7 }),
        [key]: Math.min(cur + 0.1, 3)
      }
    };
  });

  // 폰트 패밀리 순환
  const handleFontFamilyToggle = () => {
    const curIdx = fontFamilies.indexOf(preset.fontFamily);
    const nextIndex = (curIdx + 1) % fontFamilies.length;
    setPreset(p => ({ ...p, fontFamily: fontFamilies[nextIndex] }));
    document.documentElement.style.setProperty('--font-current', fontFamilies[nextIndex]);
    setShowFontName(false);  // 기존 애니메이션 즉시 종료
    setFontNameKey(prev => prev + 1);  // key 업데이트로 강제 리렌더링
    setTimeout(() => setShowFontName(true), 0);  // 새 애니메이션 시작
    if (fontNameTimeoutRef.current) clearTimeout(fontNameTimeoutRef.current);
    fontNameTimeoutRef.current = setTimeout(() => setShowFontName(false), 3000);
  };

  useEffect(() => {
    // 더블탭 확대 방지: viewport meta 태그로 제어 (user-scalable=no, maximum-scale=1.0)
    let meta = document.querySelector('meta[name=viewport]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    // 기존 content에 user-scalable, maximum-scale이 없으면 추가
    let content = meta.getAttribute('content') || '';
    if (!/user-scalable/.test(content)) content += (content ? ',' : '') + 'user-scalable=no';
    if (!/maximum-scale/.test(content)) content += (content ? ',' : '') + 'maximum-scale=1.0';
    meta.setAttribute('content', content);
    // 폰트 프리셋 적용
    document.documentElement.style.setProperty('--font-current', preset.fontFamily);
    // cleanup 불필요 (meta는 계속 유지)
  }, [preset.fontFamily]);

  // Space/Arrow 키로 소리내어 읽기, 일시정지/이어재생, 테이크 이동
  useEffect(() => {
    const onKeyDown = (e) => {
      // Ctrl+K 또는 Cmd+K로 프리셋 리셋
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPreset(defaultPreset);
        return;
      }
      // Space: 최초 소리내어 읽기 or 일시정지/이어재생
      // 에디터(텍스트박스, textarea, input 등)에 포커스가 있으면 무시
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable) {
        return;
      }
      // Backspace: 홈버튼 호출
      if (e.code === 'Backspace') {
        e.preventDefault();
        window.location.reload();
        return;
      }
      if (e.code === 'Space') {
        // 마지막 테이크까지 재생이 끝난 후(즉, takes.length > 0이고 isPlaying/Paused/Loading 모두 false)
        if (takes.length > 0 && !isPlaying && !isPaused && !loading) {
          e.preventDefault();
          handleDiceClick();
          return;
        }
        if (takes.length === 0 && !isPlaying && !isPaused && !loading) {
          e.preventDefault();
          if (!text) {
            MATERIALS.randomAny.handler(e);
            return;
          }
          handleTTS();
        } else if (isPlaying || isPaused) {
          e.preventDefault();
          handleTTS();
        }
      }
      // Arrow Up/Down: 테이크 이동
      //      const isArrowUp = e.code === 'ArrowUp' || e.code === 'Numpad8';
      //      const isArrowDown = e.code === 'ArrowDown' || e.code === 'Numpad2';
      //
      //      if ((isArrowUp || isArrowDown) && takes.length > 0) {
      //        e.preventDefault(); // 스크롤 방지
      //        
      //        let nextTake = currentTake;
      //        if (isArrowUp) {
      //          nextTake--;
      //        } else { // isArrowDown
      //          nextTake++;
      //        }
      //
      //        if (nextTake >= 0 && nextTake < takes.length) {
      //          handlePlayFromTake(nextTake);
      //        }
      //      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, isPaused, currentAudioState, text, takes.length, loading, currentTake]);

  useEffect(() => {
    if (isPaused) {
      const interval = setInterval(() => {
        setPauseDotStep(s => (s + 1) % 4);
      }, 500); // 2초 루프(4단계)
      return () => clearInterval(interval);
    } else {
      setPauseDotStep(0);
    }
  }, [isPaused]);

  // 보이스 변경시 현재 테이크의 첫 문장부터 자동 재생 (voiceId 명시적으로 전달, 버퍼 초기화)
  const handleVoiceSelect = (voice) => {
    setIsClosing(true);
    setTimeout(() => {
      setPreset(p => ({ ...p, voice: voice.name }));
      setSelectedVoice(voice);
      setVoiceMenuOpen(false);
      setIsClosing(false);
      stopPlaying();
      audioBufferRef.current = {}; // 버퍼 완전 초기화
      setTimeout(() => handlePlayFromTake(currentTake, voice.id), 0);
    }, 1000);
  };

  const handleCloseVoiceMenu = () => {
    setIsClosing(true);
    // 닫힐 때 새로운 랜덤값 생성
    setRandomPopupInitialValues();
    setTimeout(() => {
      setVoiceMenuOpen(false);
      setIsClosing(false);
    }, 1000);
  };

  const handleCloseGptGuide = () => {
    setIsGptGuideClosing(true);
    setRandomPopupInitialValues();
    setTimeout(() => {
      setShowGptGuide(false);
      setIsGptGuideClosing(false);
    }, 1000);
  };

  // 풀다운 메뉴 바깥 클릭 시 닫힘 처리는 PopupCard로 이동
  
  // Home icon position for animation
  const homeIconLeft = takes.length === 0 ? -120 : 0;
  const homeIconTop = takes.length === 0 ? -120 : 0;

  // Utility: Generate progressive steps for typewriter effect (1 char at a time)
  function getTypewriterSteps(text) {
    const steps = [];
    for (let i = 1; i <= text.length; i++) {
      steps.push(text.slice(0, i));
    }
    return steps;
  }

  // Typewriter effect for any text (with optional onStart callback)
  function useTypewriterText(text, active, intervalMs = 150, onStart) {
    const steps = getTypewriterSteps(text || '');
    const [display, setDisplay] = useState(steps[0] || '');
    const startedRef = useRef(false);
    useEffect(() => {
      if (active && steps.length > 0) {
        setDisplay(steps[0]);
        if (!startedRef.current && onStart) {
          onStart();
          startedRef.current = true;
        }
        let i = 0;
        const interval = setInterval(() => {
          i++;
          if (i < steps.length) setDisplay(steps[i]);
          else clearInterval(interval);
        }, intervalMs);
        return () => {
          clearInterval(interval);
          startedRef.current = false;
        };
      } else if (!active) {
        setDisplay(text);
        startedRef.current = false;
      }
    }, [text, active, intervalMs]);
    return display;
  }

  // Typewriter for generated title (show effect only when titleLoading 막 끝난 직후)
  const [showTypewriterTitle, setShowTypewriterTitle] = useState(false);
  const [typewriterStarted, setTypewriterStarted] = useState(false);
  useEffect(() => {
    if (!titleLoading && title && title !== '제목을 고민하는 중') {
      setShowTypewriterTitle(true);
      setTypewriterStarted(false);
      const timeout = setTimeout(() => setShowTypewriterTitle(false), (title.length + 1) * 150 + 300);
      return () => clearTimeout(timeout);
    }
  }, [title, titleLoading]);
  const animatedFinalTitle = useTypewriterText(title, showTypewriterTitle, 150, () => {
    if (!typewriterStarted) setTypewriterStarted(true);
  });

  useEffect(() => {
    // 다크/라이트 모드 전환 시 변경되는 모든 정보를 한 번에 처리
    function setThemeByMode(dark) {
      // body, html, overscroll 등 스타일 변경
      const t = dark ? darkTheme : lightTheme;
      document.body.style.background = t.background;
      document.documentElement.style.background = t.background;
      document.documentElement.style.webkitOverflowScrolling = 'touch';
      document.documentElement.style.overscrollBehavior = 'none';
      document.documentElement.style.setProperty('--app-background', t.background);
    }
    // 프리셋의 darkMode가 바뀔 때마다 테마 적용
    setThemeByMode(preset.darkMode);
  }, [preset.darkMode]);


  // 소재 데이터 구조화
  const MATERIALS = {
    news: {
      name: "수퍼톤 소식",
      list: SAMPLE_NEWS_LIST,
      voiceMapping: null, // 랜덤 목소리
      handler: (e) => {
        e.preventDefault();
        let currentText = text;
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * SAMPLE_NEWS_LIST.length);
        } while (SAMPLE_NEWS_LIST[randomIndex] === currentText);
        setText(SAMPLE_NEWS_LIST[randomIndex]);
        // 랜덤 목소리 선택
        const randomVoice = VOICES[Math.floor(Math.random() * VOICES.length)];
        setPreset(p => ({ ...p, voice: randomVoice.name }));
        setSelectedVoice(randomVoice);
      }
    },
    wayofcode: {
      name: "THE WAY OF CODE",
      list: [WAYOFCODE_TEXT],
      voiceMapping: "릭 루빈",
      handler: (e) => {
        e.preventDefault();
        setText(WAYOFCODE_TEXT);
        // 릭 루빈 목소리로 변경
        const rickVoice = VOICES.find(v => v.name === "릭 루빈");
        if (rickVoice) {
          setPreset(p => ({ ...p, voice: rickVoice.name }));
          setSelectedVoice(rickVoice);
        }
      }
    },
    literature: {
      name: "예술책 한 페이지",
      list: LITERATURE_QUOTES,
      voiceMapping: null, // 랜덤 목소리
      handler: (e) => {
        e.preventDefault();
        let currentText = text;
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * LITERATURE_QUOTES.length);
        } while (LITERATURE_QUOTES[randomIndex] === currentText);
        setText(LITERATURE_QUOTES[randomIndex]);
        // 랜덤 목소리 선택
        const randomVoice = VOICES[Math.floor(Math.random() * VOICES.length)];
        setPreset(p => ({ ...p, voice: randomVoice.name }));
        setSelectedVoice(randomVoice);
      }
    },
    musiccamp: {
      name: "배철수의 음악캠프 오프닝",
      list: MUSICCAMP_QUOTES,
      voiceMapping: "송골매 기타리스트",
      handler: (e) => {
        e.preventDefault();
        let currentText = text;
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * MUSICCAMP_QUOTES.length);
        } while (MUSICCAMP_QUOTES[randomIndex] === currentText);
        setText(MUSICCAMP_QUOTES[randomIndex]);
        // 송골매 기타리스트 목소리로 변경
        const guitarVoice = VOICES.find(v => v.name === "송골매 기타리스트");
        if (guitarVoice) {
          setPreset(p => ({ ...p, voice: guitarVoice.name }));
          setSelectedVoice(guitarVoice);
        }
      }
    },
    essay: {
      name: "보통의 존재",
      list: [ESSAY_TEXT],
      voiceMapping: "이석원",
      handler: (e) => {
        e.preventDefault();
        setText(ESSAY_TEXT);
        // 이석원 목소리로 변경
        const seokwonVoice = VOICES.find(v => v.name === "이석원");
        if (seokwonVoice) {
          setPreset(p => ({ ...p, voice: seokwonVoice.name }));
          setSelectedVoice(seokwonVoice);
        }
      }
    },
    sonagi: {
      name: "소나기",
      list: [SONAGI_TEXT],
      voiceMapping: "출판사 『무제』 사장",
      handler: (e) => {
        e.preventDefault();
        setText(SONAGI_TEXT);
        // 출판사 무제 사장 목소리로 변경
        const publisherVoice = VOICES.find(v => v.name === "출판사 『무제』 사장");
        if (publisherVoice) {
          setPreset(p => ({ ...p, voice: publisherVoice.name }));
          setSelectedVoice(publisherVoice);
        }
      }
    },
    randomAny: {
      name: "아무 글이나",
      list: [],
      voiceMapping: null, // 동적으로 결정
      handler: (e) => {
        e.preventDefault();
        // 모든 소재의 모든 글감을 하나의 배열로
        const allTexts = Object.entries(MATERIALS)
          .filter(([key]) => key !== 'randomAny')
          .reduce((acc, [_, material]) => {
            if (Array.isArray(material.list)) {
              acc.push(...material.list);
            }
            return acc;
          }, []);

        // 현재 텍스트와 다른 것 선택
        let randomText;
        do {
          randomText = allTexts[Math.floor(Math.random() * allTexts.length)];
        } while (randomText === text && allTexts.length > 1);

        // 선택된 텍스트가 속한 소재 찾기
        const materialEntry = Object.entries(MATERIALS).find(([key, material]) => 
          key !== 'randomAny' && material.list && material.list.includes(randomText)
        );

        setText(randomText);
        
        // 해당 소재의 목소리 매핑 적용
        if (materialEntry) {
          const material = materialEntry[1];
          if (material.voiceMapping) {
            // 특정 목소리가 매핑된 경우
            const mappedVoice = VOICES.find(v => v.name === material.voiceMapping);
            if (mappedVoice) {
              setPreset(p => ({ ...p, voice: mappedVoice.name }));
              setSelectedVoice(mappedVoice);
            }
          } else {
            // 랜덤 목소리인 경우
            const randomVoice = VOICES[Math.floor(Math.random() * VOICES.length)];
            setPreset(p => ({ ...p, voice: randomVoice.name }));
            setSelectedVoice(randomVoice);
          }
        }
      }
    }
  };

  // 핸들러 함수 정의
  const handleRandomNews = (e) => MATERIALS.news.handler(e);
  const handleRandomLiterature = (e) => MATERIALS.literature.handler(e);

  useEffect(() => {
    // 최초 실행 시 화면 맨 위로 스크롤 (렌더링 이후)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, []);

  // 팝업 열림/닫힘에 따른 body 스크롤 제어
  useEffect(() => {
    if (voiceMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [voiceMenuOpen]);

  // 팝업 초기값 랜덤 설정 함수
  const setRandomPopupInitialValues = () => {
    // -15도 ~ 15도 사이의 랜덤 정수
    const rotation = Math.floor(Math.random() * 51) - 25;
    
    // 회전 방향에 따른 x축 좌표 설정
    let xOffset;
    if (rotation < 0) { // 반시계 방향
      xOffset = -(Math.floor(Math.random() * 200) + 300); // -100 ~ -1
    } else { // 시계 방향 (0도 포함)
      xOffset = Math.floor(Math.random() * 200) + 300; // 1 ~ 100
    }
    
    setPopupInitialRotation(rotation);
    setPopupInitialX(xOffset);
  };

  // voiceMenuOpen 상태 변경 시 랜덤값 설정
  useEffect(() => {
    if (voiceMenuOpen) {
      setRandomPopupInitialValues();
    }
  }, [voiceMenuOpen]);

  // 클립보드에서 Voice ID를 가져와 설정하는 핸들러
  const handleCustomVoiceIdPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const validation = validateVoiceId(text);
      if (!validation.isValid) {
        alert(validation.message);
        return;
      }
      setCustomVoiceId(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      alert('클립보드 내용을 읽을 수 없습니다.');
    }
  };

  // 커스텀 목소리 선택 핸들러
  const handleCustomVoiceSelect = async () => {
    if (!customVoiceId) {
      alert('Voice ID 미 입력');
      return;
    }

    // Voice ID 유효성 검증
    const validation = validateVoiceId(customVoiceId);
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }

    try {
      // TODO: 실제 TTS API 테스트 호출 구현
      const isValid = true; // 임시로 true 설정
      
      if (!isValid) {
        alert('잘못된 Voice ID 입력');
        return;
      }

      // 유효한 경우 목소리 선택 처리
      handleVoiceSelect({
        id: customVoiceId,
        name: '내가 좋아하는 목소리',
        description: `${customVoiceId} / [↻] 목소리 바꾸기`,
        isCustom: true
      });
    } catch (err) {
      console.error('Failed to validate voice ID:', err);
      alert('잘못된 Voice ID 입력');
    }
  };

  // 목소리 바꾸기 클릭 핸들러
  const handleVoiceChange = async (e) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    await handleCustomVoiceIdPaste(); // 클립보드에서 새 Voice ID 가져오기
  };

  // VOICES 배열 수정
  const ALL_VOICES = [
    ...VOICES,
    {
      id: 'custom',
      name: '내가 좋아하는 목소리',
      description: customVoiceId 
        ? `${customVoiceId} / [↻] 목소리 바꾸기` 
        : '[+] 먼저 이곳에 붙여 넣기',
      introText: <>가 읽어줘요. <a href="https://play.supertone.ai/" target="_blank" rel="noopener noreferrer" style={{color: 'inherit', textDecoration: 'underline', textUnderlinePosition: 'under', textDecorationColor: `${theme.text}20`, textUnderlineOffset: '5%'}}>[↗] 수퍼톤 플레이</a>에서 Voice ID를 복사해서 붙여주세요.{'\n'}Voice ID: </>,
      isCustom: true
    }
  ];

  // 주사위 문자 배열
  const DICE_CHARS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  // 주사위 애니메이션 시작
  useEffect(() => {
    const interval = setInterval(() => {
      setDiceIndex(prevIndex => {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * DICE_CHARS.length);
        } while (newIndex === prevIndex);
        return newIndex;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // 주사위 클릭 핸들러
  const handleDiceClick = async () => {
    if (isRollingDice) return;
    console.log('주사위 클릭됨');

    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
    }
    const newAbortController = new AbortController();
    ttsAbortControllerRef.current = newAbortController;
    const { signal } = newAbortController;

    setIsRollingDice(true);

    // 빠른 주사위 애니메이션 시작
    if (diceIntervalRef.current) clearInterval(diceIntervalRef.current);
    diceIntervalRef.current = setInterval(() => {
      setDiceIndex(prevIndex => {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * DICE_CHARS.length);
        } while (newIndex === prevIndex);
        return newIndex;
      });
    }, 100);

    // 현재 선택된 voice 저장
    const currentVoice = selectedVoice;
    console.log('현재 voice:', currentVoice);

    // 모든 소재의 모든 글감을 하나의 배열로
    const allTexts = Object.entries(MATERIALS)
      .filter(([key]) => key !== 'randomAny')
      .reduce((acc, [_, material]) => {
        if (Array.isArray(material.list)) {
          acc.push(...material.list);
        }
        return acc;
      }, []);

    // 현재 텍스트와 다른 것 선택
    let newText;
    do {
      newText = allTexts[Math.floor(Math.random() * allTexts.length)];
    } while (newText === text && allTexts.length > 1);

    // 선택된 텍스트가 속한 소재의 이름을 찾아서 제목으로 설정
    const materialEntry = Object.entries(MATERIALS).find(([key, material]) => 
      key !== 'randomAny' && material.list && material.list.includes(newText)
    );

    console.log('선택된 글감:', materialEntry ? materialEntry[1].name : '알 수 없음');

    // 1초 후 애니메이션 종료 및 재생 시작
    setTimeout(() => {
      // 텍스트와 제목을 이 시점에 변경
      setText(newText);
      if (materialEntry) {
        setTitle(materialEntry[1].name);
        // 해당 소재의 목소리 매핑 적용
        const material = materialEntry[1];
        if (material.voiceMapping) {
          // 특정 목소리가 매핑된 경우
          const mappedVoice = VOICES.find(v => v.name === material.voiceMapping);
          if (mappedVoice) {
            setPreset(p => ({ ...p, voice: mappedVoice.name }));
            setSelectedVoice(mappedVoice);
          }
        } else {
          // 랜덤 목소리인 경우
          const randomVoice = VOICES[Math.floor(Math.random() * VOICES.length)];
          setPreset(p => ({ ...p, voice: randomVoice.name }));
          setSelectedVoice(randomVoice);
        }
      }
      console.log('텍스트 변경됨:', newText);

      if (diceIntervalRef.current) {
        clearInterval(diceIntervalRef.current);
        diceIntervalRef.current = null;
      }
      setIsRollingDice(false);
      console.log('1초 타이머 완료, 재생 시작 시도');

      // 약간의 지연 후 재생 시작 (텍스트 변경이 적용될 시간 필요)
      setTimeout(async () => {
        console.log('재생 시작 직전 텍스트:', newText); // text 대신 newText 사용

        // 기존 재생 중지
        if (currentAudio.current) {
          currentAudio.current.pause();
        }

        // 상태 초기화 (UI는 숨기지 않음)
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentTake(0);
        setCurrentWordIndex(0);
        setIsAudioPlaying(false);
        
        // takes 배열 업데이트
        const newTakes = splitTextIntoTakes(newText);
        setTakes(newTakes);
        takesRef.current = newTakes;
        
        // 최상단으로 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 재생 시작
        try {
          setLoading(true);
          setIsPlaying(true);
          setIsPaused(false);
          setFadeIn(true);
          setGeneratingTake(0);
          const firstTakeUrl = await convertToSpeech(newTakes[0], null, signal);
          if (signal.aborted) {
            console.log('Dice click action was aborted before playing.');
            return;
          }
          audioBufferRef.current = { 0: firstTakeUrl };
          if (newTakes.length > 1) {
            prepareNextTake(1, null, signal);
          }
          playTake(0);
        } catch (e) {
          if (e.name === 'AbortError') {
            console.log('Dice click TTS generation was aborted.');
            return;
          }
          console.error('재생 시작 실패:', e);
          setIsPlaying(false);
          setLoading(false);
        }
        
        console.log('재생 시작 완료');
      }, 100);
    }, 1000);
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      isUnloadingRef.current = true;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const handleSharedContent = async () => {
      const params = new URLSearchParams(window.location.search);
      const sharedContent = params.get('text') || params.get('url');

      if (sharedContent) {
        // Clear the query params from the URL so it doesn't run again on reload
        if (window.history.pushState) {
          const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.pushState({ path: newUrl }, '', newUrl);
        }

        if (/^https?:\/\//.test(sharedContent)) { // It's a URL
          const prompt = `${sharedContent}\\n\\n위 내용을 책의 문장으로 활용하게 충분한 분량으로 재구성 해줘. 해당 콘텐츠에 맞는 문체로, 문장의 나열로, 표나 카테고리 구분을 짓지 않고, 소제목도 필요없어. 가능하다면 여러 문단으로 구성해줘. 만약 댓글이 있다면 댓글내용도 요약해서 마지막에 문장 하나로 구성해줘. 내용 앞뒤에 답변도 절대 달지 말아줘.`;
          try {
            await navigator.clipboard.writeText(prompt);
            setRandomPopupInitialValues();
            setShowGptGuide(true);
            // also reset state
            setText("");
            setUrl("");
            setTitle("");
            setTakes([]);
            setCurrentTake(0);
            setIsPlaying(false);
            if (currentAudio.current) currentAudio.current.pause();
            currentAudio.current = null;
            setCurrentAudioState(null);
            setAudioUrl(null);
            setGeneratingTake(null);
            setCurrentWordIndex(0);
            setUiHidden(false);
            setIsAudioPlaying(false);
          } catch (err) {
            console.error('Failed to handle shared URL:', err);
            setText(sharedContent); // Fallback
          }
        } else { // It's plain text
          setText(sharedContent);
        }
      }
    };

    handleSharedContent();
  }, []); // Run only once on mount

  // 모든 폰트 미리 로드 (최초 렌더 후, 모든 요소 로드 이후)
  useEffect(() => {
    const handleLoad = () => {
      // Mysteria
      if (!document.fonts.check('1em Mysteria')) {
        const mysteria = new window.FontFace(
          'Mysteria',
          "url('./assets/Mysteria-Regular.otf') format('opentype')"
        );
        mysteria.load().then(font => document.fonts.add(font)).catch(() => {});
      }
      // TYPEThirtytwo
      if (!document.fonts.check('1em TYPEThirtytwo')) {
        const type32 = new window.FontFace(
          'TYPEThirtytwo',
          "url('./assets/TYPEThirtytwo.otf') format('opentype')"
        );
        type32.load().then(font => document.fonts.add(font)).catch(() => {});
      }
      // Eulyoo1945 (woff2 우선)
      if (!document.fonts.check('1em Eulyoo1945')) {
        const eulyoo = new window.FontFace(
          'Eulyoo1945',
          "url('./assets/Eulyoo1945-Regular.woff2') format('woff2'), url('./assets/Eulyoo1945-Regular.woff') format('woff'), url('./assets/Eulyoo1945-Regular.eot') format('embedded-opentype')"
        );
        eulyoo.load().then(font => document.fonts.add(font)).catch(() => {});
      }
    };
    window.addEventListener('load', handleLoad);
    return () => window.removeEventListener('load', handleLoad);
  }, []);

  // 앱 실행 시 오디오 객체 미리 생성
  useEffect(() => {
    if (!currentAudio.current) {
      currentAudio.current = new Audio();
    }
  }, []);

  // 파일 내 적당한 위치에 추가
  useEffect(() => {
    if (takes.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [takes]);

  // 1. Add a ref for the TextField
  const manuscriptInputRef = useRef();

  // 2. Add a state for the measured line height
  const [measuredLineHeight, setMeasuredLineHeight] = useState(28); // default fallback

  // Safari detection function
  const isSafari = () => {
    const ua = navigator.userAgent;
    return /^((?!chrome|android).)*safari/i.test(ua);
  };

  // 3. Effect: measure line height and set background pattern (Safari only)
  useEffect(() => {
    if (!manuscriptInputRef.current) return;
    const textarea = manuscriptInputRef.current.querySelector('textarea');
    if (!textarea) return;
    // 모든 브라우저에서 동적 줄간격 측정
    const testDiv = document.createElement('div');
    testDiv.style.position = 'absolute';
    testDiv.style.visibility = 'hidden';
    testDiv.style.pointerEvents = 'none';
    testDiv.style.whiteSpace = 'pre';
    testDiv.style.fontFamily = getComputedStyle(textarea).fontFamily;
    testDiv.style.fontSize = getComputedStyle(textarea).fontSize;
    testDiv.style.lineHeight = getComputedStyle(textarea).lineHeight;
    testDiv.textContent = 'A\nB';
    document.body.appendChild(testDiv);
    const lh = testDiv.offsetHeight / 2;
    document.body.removeChild(testDiv);
    textarea.style.backgroundImage = `repeating-linear-gradient(to bottom, transparent, transparent ${lh - 1}px, rgba(128,128,128,0.2) ${lh}px, rgba(128,128,128,0.2) ${lh}px)`;
  }, [takeFontSize, preset.lineHeight, fontFamilyIndex]);

  const autoPlayPendingIndexRef = useRef(null);
  const [autoPlayPendingIndex, setAutoPlayPendingIndex] = useState(null);
  const setAutoPlayPending = (idx) => {
    autoPlayPendingIndexRef.current = idx;
    setAutoPlayPendingIndex(idx);
  };

  return (
    <Box sx={{ bgcolor: theme.background, minHeight: "100vh", color: theme.text, pb: 10, fontFamily: "'Mysteria', sans-serif", transition: 'all 0.3s' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ bgcolor: theme.background, color: theme.text, transition: 'all 0.3s', boxShadow: 'none' }}>
        <Toolbar sx={{
          width: isTabletPC ? '40%' : '80%',
          marginLeft: 'auto',
          marginRight: 'auto',
          minHeight: 'unset',
          paddingLeft: 0,
          paddingRight: 0,
          paddingTop: 4,
          paddingBottom: '44px',
          position: 'relative',
        }}>
          {/* Home Icon: absolutely positioned, animates in/out of view */}
          <Box
            onClick={() => window.location.reload()}
            sx={{
              position: 'fixed',
              left: `${homeIconLeft}px`,
              top: `${homeIconTop}px`,
              width: 48,
              height: 48,
              cursor: 'pointer',
              zIndex: 2001,
              p: 0,
              m: 0,
              display: 'block',
              transform: 'scale(0.8)',
              transformOrigin: 'top left',
              transition: 'left 1s cubic-bezier(0.4,0,0.2,1), top 1s cubic-bezier(0.4,0,0.2,1), background-color 0.2s',
              borderRadius: '8px',
              '&:active': {
                backgroundColor: 'rgba(139, 69, 19, 0.1)',
              },
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 100 100" style={{ display: 'block', position: 'absolute', left: 0, top: 0, padding: 0, margin: 0, overflow: 'visible' }}>
              {/* 삼각형 1 */}
              <polygon
                points="0,0 100,0 0,65"
                fill={preset.darkMode ? '#111111' : '#cccccc'}
                style={{ transition: 'fill 0.3s' }}
              />
              {/* 삼각형 2 */}
              <polygon
                points="100,0 0,65 70,84"
                fill={preset.darkMode ? '#222222' : '#efefef'}
                style={{
                  filter: 'drop-shadow(3px 3px 30px rgba(128,128,128,0.3))',
                  transition: 'fill 0.3s',
                }}
              />
            </svg>
          </Box>
          <Typography variant="h6" component="div" sx={{
            width: '100%',
            color: theme.text,
            fontWeight: 400,
            fontSize: isTabletPC ? '6rem' : '3rem',
            WebkitTextStroke: '0.03em',
            paintOrder: 'stroke fill',
            letterSpacing: 'normal',
            lineHeight: 1.2,
            textAlign: 'center',
            marginTop: isTabletPC ? '40px' : '30px',
            marginBottom: isTabletPC ? '0px' : '0px',
            wordBreak: 'keep-all',
          }}>
            {showTypewriterTitle
              ? (typewriterStarted ? animatedFinalTitle : '')
              : (
                title
                  ? title
                  : (
                    <span>
                      {titleChars.map((char, idx) =>
                        char === ' ' ? (
                          ' '
                        ) : (
                          <span
                            key={idx}
                            style={
                              idx === randomTitleIndex
                                ? { position: 'relative', top: '-12px', display: 'inline-block', transition: 'top 0.3s' }
                                : {}
                            }
                          >
                            {char}
                          </span>
                        )
                      )}
                    </span>
                  )
              )
            }
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          width: `${containerWidth * 100}%`,
          mx: 'auto',
          mt: 4,
          p: 2,
          color: theme.text,
          borderRadius: 3,
          transition: 'all 0.3s',
        }}
      >
        {/* 안내 텍스트도 숨김 처리 */}
        {!uiHidden && (
          <div>
            <Typography sx={{ color: theme.text, fontSize: 16 }}>
              소리내어 읽고 싶은 글이 있나요-
            </Typography>
          </div>
        )}
        <input
          id="file-upload-input"
          type="file"
          accept=".txt,.pdf"
          style={{ display: "none" }}
          onChange={e => setFile(e.target.files[0])}
        />
        {/* UI 숨김: 입력/설정/URL/모델 등 영역 전체를 숨김 */}
        {!uiHidden && (
          <>
        <FormControl fullWidth sx={{ mt: 3, border: 'none', boxShadow: 'none', bgcolor: 'transparent', display: 'none' }}>
              <InputLabel sx={{ color: theme.text }}>Speech 모델</InputLabel>
          <Select
            value={model}
            label="Speech 모델"
            onChange={e => setModel(e.target.value)}
                sx={{ color: theme.text }}
          >
                <MenuItem value="sona_speech_1" sx={{ color: theme.text }}>Sona Speech 1</MenuItem>
                <MenuItem value="sona_speech_2" sx={{ color: theme.text }}>Sona Speech 2</MenuItem>
            {/* 필요시 모델 추가 */}
          </Select>
        </FormControl>
          </>
        )}
        {/* 글감 모음/구분선 */}
        {!uiHidden && takes.length === 0 && (
          <Box sx={{ mt: 2, mb: 2 }}>
            {/* 소제목 - 본문 스타일과 동일 */}
            <Box sx={{ fontWeight: 400, fontSize: 16, color: theme.text, mb: 1, lineHeight: 2 }}>글감 모음</Box>
            {/* 글감 배열 정의 */}
            {(() => {
              const materialItems = [
                {
                  label: '+ 복사한 글 붙여넣기',
                  text: '복사한 글 붙여넣기',
                  onClick: async (e) => {
              e.preventDefault();
              try {
                const clip = await navigator.clipboard.readText();
                if (/^https?:\/\//.test(clip)) {
                  const prompt = `${clip}\n\n위 내용을 책의 문장으로 활용하게 충분한 분량으로 재구성 해줘. 해당 콘텐츠에 맞는 문체로, 문장의 나열로, 표나 카테고리 구분을 짓지 않고, 소제목도 필요없어. 가능하다면 여러 문단으로 구성해줘. 만약 댓글이 있다면 댓글내용도 요약해서 마지막에 문장 하나로 구성해줘. 내용 앞뒤에 답변도 절대 달지 말아줘.`;
                  await navigator.clipboard.writeText(prompt);
                  setRandomPopupInitialValues();
                  setShowGptGuide(true);
                  setText("");
                  setUrl("");
                  setTitle("");
                  setTakes([]);
                  setCurrentTake(0);
                  setIsPlaying(false);
                  currentAudio.current = null;
                  setCurrentAudioState(null);
                  setAudioUrl(null);
                  setGeneratingTake(null);
                  setCurrentWordIndex(0);
                  setUiHidden(false);
                  setIsAudioPlaying(false);
                } else {
                  setText(clip);
                }
              } catch (e) {
                alert("클립보드 접근이 차단되었습니다. 브라우저 권한을 확인하세요.");
              }
                  }
                },
                {
                  label: '? 어떤 글도 좋아 :)',
                  text: '어떤 글도 좋아 :)',
                  onClick: MATERIALS.randomAny.handler
                },
                {
                  label: '- 산문집 보통의 존재',
                  text: '산문집 보통의 존재',
                  onClick: MATERIALS.essay.handler
                },
                {
                  label: '- 소설 소나기',
                  text: '소설 소나기',
                  onClick: MATERIALS.sonagi.handler
                },
                {
                  label: '- 배철수의 음악캠프',
                  text: '배철수의 음악캠프',
                  onClick: MATERIALS.musiccamp.handler
                },
                {
                  label: '- 예술책 한 페이지',
                  text: '예술책 한 페이지',
                  onClick: handleRandomLiterature
                },
                {
                  label: '- 수퍼톤 소식',
                  text: '수퍼톤 소식',
                  onClick: handleRandomNews
                },
                {
                  label: '- THE WAY OF CODE',
                  text: 'THE WAY OF CODE',
                  onClick: MATERIALS.wayofcode.handler
                }
              ];
              if (isTabletPC) {
                // 3단 가로 분배
                const nCols = 3;
                const colLength = Math.ceil(materialItems.length / nCols);
                const colItems = Array.from({ length: nCols }, (_, colIdx) =>
                  materialItems.slice(colIdx * colLength, (colIdx + 1) * colLength)
                );
                const getPrefix = (label) => label.match(/^([+\-?])\s?/)?.[1] || '';
                const getText = (label) => label.replace(/^([+\-?])\s?/, '');
                return (
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {colItems.map((col, colIdx) => (
                      <Box key={colIdx} sx={{ flex: 1, minWidth: 0 }}>
                        {col.map((item, idx) => (
                          <div key={idx} style={{ marginBottom: 8 }}>
                            <a href="#" onClick={item.onClick} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {getPrefix(item.label)}{' '}
                              <span style={{ textDecoration: 'underline', textUnderlinePosition: 'under', textDecorationColor: `${theme.text}20`, textUnderlineOffset: '5%' }}>{getText(item.label)}</span>
                            </a>
                          </div>
                        ))}
                      </Box>
                    ))}
                  </Box>
                );
              } else {
                // 모바일: 1단
                const getPrefix = (label) => label.match(/^([+\-?])\s?/)?.[1] || '';
                const getText = (label) => label.replace(/^([+\-?])\s?/, '');
                return (
                  <Box>
                    {materialItems.map((item, idx) => (
                      <div key={idx} style={{ marginBottom: 8 }}>
                        <a href="#" onClick={item.onClick} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {getPrefix(item.label)}{' '}
                          <span style={{ textDecoration: 'underline', textUnderlinePosition: 'under', textDecorationColor: `${theme.text}20`, textUnderlineOffset: '5%' }}>{getText(item.label)}</span>
                        </a>
                      </div>
                    ))}
                  </Box>
                );
              }
            })()}
          </Box>
        )}

        {/* 원고지 안내 + 텍스트박스 */}
        {!uiHidden && takes.length === 0 && (
          <>
            <Box sx={{ textAlign: 'left', fontSize: 16, color: theme.text, lineHeight: 2, mb: 1, mt: 1 }}>
              {text === '' ? (
                <>원고지. 적을 수 있어요.</>
              ) : (
                <>
                  원고지. 다듬거나{' '}
                  <span
                    style={{
                      textDecoration: 'underline',
                      textUnderlinePosition: 'under',
                      textDecorationColor: `${theme.text}20`,
                      textUnderlineOffset: '5%',
                      cursor: 'pointer'
                    }}
                    onClick={() => setText('')}
                  >
                    지울 수
                  </span>
                  {' '}있어요.
                </>
              )}
            </Box>
            <Box sx={{ width: '82vw', maxWidth: '100%', height: 0, borderTop: `1px solid ${theme.text}66`, margin: '5px auto 0 auto' }} />
        <Box sx={{ position: 'relative', mt: 3 }} ref={manuscriptInputRef}>
          <TextField
            fullWidth
            multiline
            minRows={5}
            value={text}
            onChange={e => setText(e.target.value)}
            inputRef={input => { window._mainTextField = input; }}
            InputLabelProps={{ style: { color: theme.text } }}
            InputProps={{ style: { color: theme.text, background: 'transparent', fontSize: 15, lineHeight: 1.7, border: 'none', boxShadow: 'none', padding: 0, marginTop: '-15px', border: '0px' } }}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
            }}
          />
          {text === "" && (
                <>
                  {/* 좌상단 80x80px 클릭시 입력모드만 */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '-15px', left: 0, width: '100%', height: '35px',
                      zIndex: 3, cursor: 'text',
                      background: 'transparent',
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      if (window._mainTextField) window._mainTextField.focus();
                    }}
                  />
                  {/* 나머지 영역 클릭시 기존처럼 클립보드 붙여넣기 */}
            <Box
              sx={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 2,
                marginTop: '-10px',
                cursor: 'pointer',
                borderRadius: 2,
                color: '#44444440',
                fontSize: 16,
                WebkitTapHighlightColor: 'rgba(139, 69, 19, 0.1)',
                '&:active': {
                  backgroundColor: 'rgba(139, 69, 19, 0.1)',
                },
              }}
                    onClick={async (e) => {
                      // 좌상단 80x80px 클릭시 이 이벤트는 무시됨
                try {
                  const clip = await navigator.clipboard.readText();
                  if (/^https?:\/\//.test(clip)) {
                    // URL이면 프롬프트를 클립보드에 복사하고 안내 UI 표시, 서비스 초기화
                    const prompt = `${clip}\n\n위 내용을 책의 문장으로 활용하게 충분한 분량으로 재구성 해줘. 해당 콘텐츠에 맞는 문체로, 문장의 나열로, 표나 카테고리 구분을 짓지 않고, 소제목도 필요없어. 가능하다면 여러 문단으로 구성해줘. 만약 댓글이 있다면 댓글내용도 요약해서 마지막에 문장 하나로 구성해줘. 내용 앞뒤에 답변도 절대 달지 말아줘.`;
                    await navigator.clipboard.writeText(prompt);
                    setRandomPopupInitialValues();
                    setShowGptGuide(true);
                    setText("");
                    setUrl("");
                    setTitle("");
                    setTakes([]);
                    setCurrentTake(0);
                    setIsPlaying(false);
                    currentAudio.current = null;
                    setCurrentAudioState(null);
                    setAudioUrl(null);
                    setGeneratingTake(null);
                    setCurrentWordIndex(0);
                    setUiHidden(false);
                    setIsAudioPlaying(false);
                    // location.reload(); // 필요시 주석 해제
                  } else {
                  setText(clip);
                  }
                } catch (e) {
                  alert("클립보드 접근이 차단되었습니다. 브라우저 권한을 확인하세요.");
                }
              }}
            >
                클립보드의 원고를 붙여 넣으세요
            </Box>
                </>
          )}
        </Box>
          </>
        )}
        {/* 주석 영역 */}
        {!uiHidden && takes.length === 0 && (
          <Box sx={{ mt: 2, px: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <span style={{
                fontSize: '70%',
                opacity: 0.7,
                color: theme.text,
                lineHeight: 1.4,
                minWidth: 2,
                fontWeight: 700,
                marginRight: 4,
                display: 'inline-block',
              }}>*</span>
              <Typography 
                sx={{ 
                  color: theme.text, 
                  fontSize: '70%', 
                  opacity: 0.7,
                  whiteSpace: 'pre-line',
                  lineHeight: 1.4,
                  textIndent: 0,
                  margin: 0,
                  display: 'block',
                  // 줄바꿈 시 * 다음 줄 들여쓰기
                  '&:not(:first-of-type)': {
                    textIndent: '-1.2em',
                    paddingLeft: '1.2em',
                  }
                }}
              >
                 음성생성에 수퍼톤의 'Sona Speech 1'을 사용합니다. 아직은 Neutral 스타일을 보유한 보이스만 사용 가능합니다. 아직은 클립보드의 글과 웹주소만 지원합니다. 미디어나 파일 읽어주기도 준비 중입니다. 스타일과 읽기속도 반영 예정입니다. 앱과 크롬 익스텐션으로 제공 예정입니다. 일부 라이센스가 해결되지 않은 소재를 활용할 수 있습니다. 해서, 외부공개를 금합니다. 버그가 많아요. -d
              </Typography>
            </Box>
        </Box>
        )}
        {/* GPT 안내 UI */}
        {(showGptGuide || isGptGuideClosing) && (
          <PopupCard
            isOpen={showGptGuide}
            isClosing={isGptGuideClosing}
            onClose={handleCloseGptGuide}
            title="글 써 드려요"
            popupInitialX={popupInitialX}
            popupInitialRotation={popupInitialRotation}
            theme={theme}
            isTabletPC={isTabletPC}
            sx={{ zIndex: 3000 }}
          >
            <Box sx={{ px: 3, color: `${theme.text}B3` }}>
              <Typography sx={{ whiteSpace: 'pre-line', mb: 3 }}>
                {`웹 내용 요약은 준비하고 있어요. 대신 간단한 글 만들기를 준비했어요.
                
                  - 클립보드에 프롬프트를 준비해뒀어요.
                  - 아래 서비스 중에 하나를 골라요.
                  - 프롬프트에 클립보드를 붙여넣어요.
                  - 답변을 복사해요.
                  - 이곳에 붙여 넣어요.
                  - 이제 준비 끝! 소리내어 읽기 : )`}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.5 }}>
                {[
                  { name: 'Perplexity', url: 'https://www.perplexity.ai/', description: '*뉴스, 유튜브. 요즘 최애.' },
                  { name: 'chatGPT', url: 'https://chatgpt.com/?model=4o', description: '*저작권에 민감해요.' },
                  { name: 'Grok', url: 'https://grok.com/', description: '*일론 머스크...' },
                ].map(item => (
                  <Typography
                    key={item.name}
                    sx={{
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    onClick={() => {
                      handleCloseGptGuide();
                      window.open(item.url, '_blank');
                    }}
                  >
                    <span style={{
                      textDecoration: 'underline',
                      textUnderlineOffset: '5px',
                      textDecorationColor: `${theme.text}66`,
                    }}>{item.name}</span>
                    <span style={{ marginLeft: '8px', color: `${theme.text}B3` }}>{item.description}</span>
                  </Typography>
                ))}
              </Box>
            </Box>
            <Box sx={{ height: 30 }} />
          </PopupCard>
        )}
        {/* takes.length > 0일 때 테이크 표시 */}
        {takes.length > 0 && (
          <Box sx={{ mt: 0 }} ref={takesContainerRef}>
            {takes.map((take, index) => (
              <Box
                key={take.name}
                className={index === currentTake ? 'current-take' : ''}
                sx={{
                  mb: `${preset.lineHeight[isTabletPC ? 'pc' : 'mobile']}rem`,
                  pb: 0,
                  cursor: 'pointer',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s ease-in-out',
                  '&:active': {
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                  },
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseDown={() => handlePlayFromTake(index)}
              >
                {generatingTake === index ? (
                  <Box sx={{ transition: 'opacity 1s', opacity: fadeIn ? 1 : 0.4 }}>
                    <HighlightedText
                      text={take}
                      currentIndex={-1}
                      fontSize={preset.fontSize[isTabletPC ? 'pc' : 'mobile']}
                      isCurrentTake={index === currentTake}
                    />
                  </Box>
                ) : (
                  <HighlightedText
                    text={take}
                    currentIndex={index === currentTake && isPlaying && isAudioPlaying ? currentWordIndex : -1}
                    fontSize={preset.fontSize[isTabletPC ? 'pc' : 'mobile']}
                    isCurrentTake={index === currentTake}
                  />
                )}
              </Box>
            ))}
            {/* 푸터 영역 */}
            <Box sx={{ 
              mt: '100px', 
              mb: '100px', 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center'
            }}
            className="dice-footer-box"
            >
              <Box 
                onClick={handleDiceClick}
                sx={{ 
                  fontSize: `${(preset.fontSize[isTabletPC ? 'pc' : 'mobile'] ?? 15) * 3}px`,
                  cursor: 'pointer',
                  fontWeight: 100, // 가장 얇은 두께
                  opacity: isRollingDice ? 1 : 0.2,
                  transition: 'opacity 0.3s, background-color 0.2s',
                  userSelect: 'none',
                  color: theme.text,
                  padding: '1rem',
                  borderRadius: '50%',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {DICE_CHARS[diceIndex]}
              </Box>
            </Box>
          </Box>
        )}

        {audioUrl && (
          <Card sx={{ mt: 4, bgcolor: 'transparent', color: theme.text, boxShadow: 'none', border: 'none' }}>
            <CardContent sx={{ bgcolor: 'transparent', boxShadow: 'none', border: 'none' }}>
              <audio controls style={{ width: "100%" }}>
                <source src={audioUrl} type="audio/mp3" />
                오디오를 지원하지 않는 브라우저입니다.
              </audio>
            </CardContent>
          </Card>
        )}
      </Box>
      {/* 상태 정보 플로팅 */}
      <Box sx={{
        position: 'fixed',
        right: 15,
        bottom: 15, // 플로팅 버튼 높이(56) + 10px
        zIndex: 2000,
        textAlign: 'right',
        color: '#888',
        fontSize: 13,
        pointerEvents: 'none',
        minWidth: 60
      }}>
        {/* 상태 플로팅 로직 개선 + 쉬고 있을 때 점 애니메이션 */}
        {isPaused ? (
          (() => {
            const dotOpacities = [
              [0, 0, 0], // 0: none
              [1, 0, 0], // 1: one
              [1, 1, 0], // 2: two
              [1, 1, 1], // 3: three
            ][pauseDotStep] || [0, 0, 0];
            return (
              <span style={{ letterSpacing: 1 }}>
                <span style={{ opacity: dotOpacities[0] }}>.</span>
                <span style={{ opacity: dotOpacities[1] }}>.</span>
                <span style={{ opacity: dotOpacities[2] }}>.</span>
              </span>
            );
          })()
        ) : (isPlaying || generatingTake !== null) && (
          <span>
            {/* 현재 재생중인 테이크 번호 */}
            {isPlaying && currentAudio.current && generatingTake !== currentTake && (
              <span>{currentTake + 1}</span>
            )}
            {/* 생성중인 테이크 번호(깜빡임) */}
            {generatingTake !== null && (
              <Fade in={fadeIn} timeout={1000} appear={false}>
                <span style={isPlaying && currentAudio.current && generatingTake !== currentTake ? { marginLeft: 6 } : {}}>{generatingTake + 1}</span>
              </Fade>
            )}
          </span>
        )}
      </Box>
      {/* 플로팅 버튼 */}
      <Box sx={{ position: 'fixed', left: 0, bottom: 0, width: '100%', zIndex: 1000, p: 0, m: 0 }}>
        <Box sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          pt: 0,
          pb: 0,
          bgcolor: theme.background,
          transition: 'all 0.3s',
        }}>
          {/* 두줄 보더 */}
          <Box sx={{
            width: '82vw',
            maxWidth: '82%',
            height: 0,
            borderTop: `1px solid ${theme.text}66`, // 40% opacity
            margin: '0 auto',
          }} />
          <Box sx={{
            width: '82vw',
            maxWidth: '82%',
            height: 0,
            borderTop: `1px solid ${theme.text}66`, // 40% opacity
            margin: '3px auto 0 auto', // 간격 3px
          }} />
        <Button
            variant="text"
          fullWidth
            disableRipple
            disableTouchRipple
          sx={{
            m: 0,
            p: 0,
            minHeight: 0,
            minWidth: 0,
            borderRadius: 0,
            fontWeight: "normal",
            WebkitTextStroke: '0.03em',
            paintOrder: 'stroke fill',
            fontSize: 18,
              height: '67px',
              lineHeight: '67px',
              background: theme.background,
              color: theme.text,
              border: 0,
              boxShadow: 'none',
              position: 'relative',
              transition: 'all 0.3s',
              zIndex: 1001,
            }}
            disabled={!text}
            onClick={handleTTS}
          >
            <span style={{ display: 'inline-block' }}>
              {/* 기존 텍스트 렌더링 로직 그대로 */}
              {isPlaying && !isPaused ? (
                <span style={{ cursor: 'pointer' }}>
                  <span
                    style={{
                      textDecoration: 'underline',
                      textUnderlinePosition: 'under',
                      display: 'inline',
                      textDecorationColor: `${theme.text}66`, // 40% opacity, matches border
                      textUnderlineOffset: '5%',
                      transform: 'translateY(-5%)',
                    }}
                    onClick={e => { e.stopPropagation(); setVoiceMenuOpen(v => !v); }}
                  >
                    {selectedVoice.name}
                  </span>
                  님이
                  {'\u200A'}
                  <span
                    style={{
                      textDecoration: 'underline',
                      textUnderlinePosition: 'under',
                      display: 'inline',
                      marginLeft: 2,
                      textDecorationColor: `${theme.text}66`, // 40% opacity, matches border
                      textUnderlineOffset: '5%',
                      transform: 'translateY(-5%)',
                    }}
                  >
                    읽고 있어요
                  </span>
                </span>
              ) : isPaused ? (
                <span style={{ cursor: 'pointer' }}>
                  <span
                    style={{
                      textDecoration: 'underline',
                      textUnderlinePosition: 'under',
                      display: 'inline',
                      textDecorationColor: `${theme.text}66`, // 40% opacity, matches border
                      textUnderlineOffset: '5%',
                    }}
                    onClick={e => { e.stopPropagation(); setVoiceMenuOpen(v => !v); }}
                  >
                    {selectedVoice.name}
                  </span>
                  님이
                  {'\u2009'}
                  <span
                    style={{
                      textDecoration: 'underline',
                      textUnderlinePosition: 'under',
                      display: 'inline',
                      marginLeft: 2,
                      textDecorationColor: `${theme.text}66`, // 40% opacity, matches border
                      textUnderlineOffset: '5%',
                    }}
                  >
                    쉬고 있어요
                  </span>
                </span>
              ) : (
                <span style={{ color: theme.text}}>
                  소리내어 읽기
                </span>
              )}
            </span>
        </Button>
        {(voiceMenuOpen || isClosing) && (
          <PopupCard
            isOpen={voiceMenuOpen}
            isClosing={isClosing}
            onClose={handleCloseVoiceMenu}
            title="읽는 이"
            popupInitialX={popupInitialX}
            popupInitialRotation={popupInitialRotation}
            theme={theme}
            isTabletPC={isTabletPC}
            sx={{ zIndex: 3000 }}
          >
            {ALL_VOICES.map((v, idx) => (
              <Box
                key={v.id}
                sx={{
                  pt: '5px',
                  pb: '10px',
                  px: 3,
                  cursor: v.isCustom ? 'default' : 'pointer',
                  borderRadius: '8px',
                  WebkitTapHighlightColor: 'rgba(139, 69, 19, 0.1)',
                  ...(!v.isCustom && {
                    '&:active': {
                      backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    },
                  }),
                }}
                {...(!v.isCustom && {
                  onMouseDown: e => {
                    e.stopPropagation();
                    handleVoiceSelect(v);
                  }
                })}
              >
                <Typography
                  sx={{
                    textAlign: 'left',
                    textTransform: 'none',
                    '& span': {
                      textTransform: 'none'
                    }
                  }}
                >
                  <span
                    style={{
                      color: theme.text,
                      textDecoration: 'underline',
                      textUnderlineOffset: '5px',
                      textDecorationColor: `${theme.text}66`,
                      cursor: v.isCustom ? 'pointer' : 'inherit',
                }}
                    {...(v.isCustom ? {
                      onMouseDown: (e) => {
                        e.stopPropagation();
                        if (!customVoiceId) {
                          alert('Voice ID 미 입력');
                          return;
                        }
                        handleCustomVoiceSelect();
                      }
                    } : {})}
              >
                {v.name}
                  </span>
                  {v.introText && (
                    <span style={{
                      color: `${theme.text}B3`,
                      whiteSpace: 'pre-line',
                    }}>
                      {v.introText}
                    </span>
                  )}
                  {v.isCustom && customVoiceId ? (
                    <span style={{
                      color: `${theme.text}B3`,
                    }}>
                      <span>{customVoiceId} / </span>
                      <span
                        style={{
                          textDecoration: 'underline',
                          textUnderlineOffset: '5px',
                          textDecorationColor: `${theme.text}66`,
                          cursor: 'pointer',
                        }}
                        onMouseDown={handleVoiceChange}
                      >
                        [↻] 목소리 바꾸기
                      </span>
                    </span>
                  ) : v.isCustom ? (
                    <span
                      style={{
                        color: `${theme.text}B3`,
                        textDecoration: 'underline',
                        textUnderlineOffset: '5px',
                        textDecorationColor: `${theme.text}66`,
                        cursor: 'pointer',
                      }}
                      onMouseDown={handleCustomVoiceIdPaste}
                    >
                      {v.description}
                    </span>
                  ) : (
                    <span style={{
                      color: `${theme.text}B3`,
                      textDecoration: v.isCustom ? 'underline' : 'none',
                      textUnderlineOffset: '5px',
                      textDecorationColor: `${theme.text}66`,
                      cursor: v.isCustom ? 'pointer' : 'default',
                    }}>
                      {v.description}
                    </span>
                  )}
                </Typography>
              </Box>
            ))}
            <Box sx={{ height: 30 }} />
          </PopupCard>
        )}
        </Box>
      </Box>
      <Backdrop
        sx={{ zIndex: 2999, backgroundColor: 'transparent' }}
        open={voiceMenuOpen || showGptGuide}
        onClick={() => {
          if (voiceMenuOpen) handleCloseVoiceMenu();
          if (showGptGuide) handleCloseGptGuide();
        }}
      />
      {/* 오른쪽 세로 중앙 텍스트 아이콘 (스케일 1.5배) */}
      <Box
        sx={{
          position: 'fixed',
          right: '2%',
          top: '50%',
          transform: `translateY(-50%) scale(${isTabletPC ? 1.0 : 1})`,
          zIndex: 2100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: '22px',
          color: 'rgba(140,140,140, 0.5)',
          userSelect: 'none',
        }}
      >
        <Box sx={iconButtonStyle} onClick={handleScrollTop}>
          <span>^</span>
        </Box>
        <Box sx={{ ...iconButtonStyle, fontSize: '120%' }} onClick={handleScrollCurrentTake}>
          <span>~</span>
        </Box>
        <Box sx={{ ...iconButtonStyle, fontSize: '90%' }} onClick={handleFontSizeUp}>
          <span>+</span>
        </Box>
        <Box sx={{ ...iconButtonStyle, fontSize: '90%' }} onClick={handleFontSizeDown}>
          <span>-</span>
        </Box>
        <Box sx={{ ...iconButtonStyle, fontSize: '90%' }} onClick={handleWidthUp}>
          <span>&gt;</span>
        </Box>
        <Box sx={{ ...iconButtonStyle, fontSize: '90%' }} onClick={handleWidthDown}>
          <span>&lt;</span>
        </Box>
        <Box sx={{ ...iconButtonStyle, fontSize: '80%' }} onClick={handleLineHeightUp}>
          <span>∧</span>
        </Box>
        <Box sx={{ ...iconButtonStyle, fontSize: '80%' }} onClick={handleLineHeightDown}>
          <span>∨</span>
        </Box>
        <Box sx={{ ...iconButtonStyle, fontSize: '80%' }} onClick={handleToggleDark}>
          <span>●</span>
        </Box>
        {/* DIM 처리된 테이크 공유(가위) 아이콘 */}
        <Box sx={{ ...iconButtonStyle, fontSize: '80%', opacity: 0.7, pointerEvents: 'none', transform: 'rotate(-90deg)' }}>
          <span>✄</span>
        </Box>
        <Box sx={{ ...iconButtonStyle, fontSize: '80%', position: 'relative' }} onClick={handleFontFamilyToggle}>
          <span>ㄱ</span>
          {showFontName && (
            <Box
              key={fontNameKey}
              sx={{
                position: 'absolute',
                left: '50%',
                top: 'calc(120% + 5px)',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: theme.text,
                opacity: 0.5,
                fontSize: '15px',
                animation: 'fadeInOut 3s forwards',
                '@keyframes fadeInOut': {
                  '0%': { opacity: 0 },
                  '5%': { opacity: 0.3 },
                  '80%': { opacity: 0.3 },
                  '100%': { opacity: 0 }
                }
              }}>
              {(() => {
                let fontName;
                switch (preset.fontFamily) {
                  case 'var(--font-mysteria)':
                    fontName = '지백체';
                    break;
                  case 'var(--font-type32)':
                    fontName = '서른둘체';
                    break;
                  case 'var(--font-serif)':
                    fontName = '을유1945체';
                    break;
                  case 'var(--font-roehoe)':
                    fontName = '노회찬체';
                    break;
                  case 'var(--font-exqt)':
                    fontName = 'exqt체';
                    break;
                  case 'var(--font-sam3kr)':
                    fontName = '삼국지3체';
                    break;
                  case 'var(--font-system)':
                    fontName = '시스템기본서체';
                    break;
                  default:
                    fontName = '';
                }
                return fontName.split('').map((char, index) => (
                  <span key={index} style={{ lineHeight: '1.2em' }}>{char}</span>
                ));
              })()}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
