import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChessGame, ChessChallenge } from '../types';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { sounds } from '../lib/sounds';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import {
  Swords,
  Clock,
  Flag,
  Handshake,
  RotateCcw,
  Crown,
  Bot,
  LogIn,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Sliders,
  HelpCircle,
  Eye,
} from 'lucide-react';

const PIECE_SYMBOLS: Record<string, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
  P: '♙',
  N: '♘',
  B: '♗',
  R: '♖',
  Q: '♕',
  K: '♔',
};

// Piece values for material advantage calculation
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-Square Tables (White perspective: rank 8 top row, rank 1 bottom row)
const PST: Record<string, number[]> = {
  p: [
      0,  0,  0,  0,  0,  0,  0,  0,
     50, 50, 50, 50, 50, 50, 50, 50,
     10, 10, 20, 30, 30, 20, 10, 10,
      5,  5, 10, 25, 25, 10,  5,  5,
      0,  0,  0, 20, 20,  0,  0,  0,
      5, -5,-10,  0,  0,-10, -5,  5,
      5, 10, 10,-20,-20, 10, 10,  5,
      0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
     20,  20,   0,   0,   0,   0,  20,  20,
     20,  30,  10,   0,   0,  10,  30,  20,
  ],
};

function evaluateBoard(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -99999 : 99999;
  }
  if (game.isDraw()) return 0;

  let totalScore = 0;
  const board = game.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const type = piece.type;
      const isWhite = piece.color === 'w';
      const pieceVal = PIECE_VALUES[type] || 0;

      const tableIndex = isWhite ? r * 8 + c : (7 - r) * 8 + c;
      const posVal = PST[type] ? PST[type][tableIndex] : 0;

      const score = pieceVal + posVal;
      if (isWhite) totalScore += score;
      else totalScore -= score;
    }
  }

  // Positional mobility
  const mobility = game.moves().length * 2;
  totalScore += game.turn() === 'w' ? mobility : -mobility;

  return totalScore;
}

function scoreMove(move: any): number {
  let score = 0;
  if (move.captured) {
    const victimVal = PIECE_VALUES[move.captured] || 100;
    const attackerVal = PIECE_VALUES[move.piece] || 100;
    score += 1000 + victimVal * 10 - attackerVal;
  }
  if (move.promotion) {
    score += 9000;
  }
  if (move.san.includes('+')) {
    score += 500;
  }
  if (['d4', 'd5', 'e4', 'e5'].includes(move.to)) {
    score += 60;
  }
  return score;
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  deadline: number
): number {
  if (depth === 0 || game.isGameOver() || Date.now() >= deadline) {
    return evaluateBoard(game);
  }

  const moves = game.moves({ verbose: true });
  moves.sort((a: any, b: any) => scoreMove(b) - scoreMove(a));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      if (Date.now() >= deadline) break;
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, false, deadline);
      game.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      if (Date.now() >= deadline) break;
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, true, deadline);
      game.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestBotMove(game: Chess, diff: Difficulty, maxThinkingMs = 4200): any {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
  const deadline = Date.now() + maxThinkingMs;

  // Easy: Casual play with 40% blunder / random move chance
  if (diff === 'easy') {
    if (Math.random() < 0.35) {
      const captures = moves.filter((m: any) => m.captured || m.san.includes('+'));
      if (captures.length > 0) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Medium: Positional search (1-ply) with piece-square tables & captures
  if (diff === 'medium') {
    const isBotWhite = game.turn() === 'w';
    let bestScore = isBotWhite ? -Infinity : Infinity;
    let candidates: any[] = [];

    for (const move of moves) {
      game.move(move);
      const score = evaluateBoard(game) + (Math.random() * 20 - 10);
      game.undo();

      if (isBotWhite) {
        if (score > bestScore) {
          bestScore = score;
          candidates = [move];
        } else if (score === bestScore) {
          candidates.push(move);
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          candidates = [move];
        } else if (score === bestScore) {
          candidates.push(move);
        }
      }
    }
    return candidates[Math.floor(Math.random() * candidates.length)] || moves[0];
  }

  // Hard: Strong Engine with 2-3 ply Alpha-Beta search strictly capped under 5 seconds
  const isBotWhite = game.turn() === 'w';
  let bestScore = isBotWhite ? -Infinity : Infinity;
  let bestMove = moves[0];
  moves.sort((a: any, b: any) => scoreMove(b) - scoreMove(a));

  // Depth 2 search: Fast baseline tactical calculation
  for (const move of moves) {
    if (Date.now() >= deadline) break;
    game.move(move);
    const score = minimax(game, 2, -Infinity, Infinity, !isBotWhite, deadline);
    game.undo();

    if (isBotWhite) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  // Deepen to Depth 3 if plenty of time remains before the 5s limit
  if (Date.now() < deadline - 1500 && moves.length <= 35) {
    let d3BestScore = isBotWhite ? -Infinity : Infinity;
    let d3BestMove = bestMove;
    for (const move of moves) {
      if (Date.now() >= deadline) break;
      game.move(move);
      const score = minimax(game, 2, -Infinity, Infinity, !isBotWhite, deadline);
      game.undo();

      if (isBotWhite) {
        if (score > d3BestScore) {
          d3BestScore = score;
          d3BestMove = move;
        }
      } else {
        if (score < d3BestScore) {
          d3BestScore = score;
          d3BestMove = move;
        }
      }
    }
    if (d3BestMove) bestMove = d3BestMove;
  }

  return bestMove;
}

type ChessMode = 'bot' | 'multiplayer' | 'local';
type Difficulty = 'easy' | 'medium' | 'hard';

export const ChessPage: React.FC = () => {
  const { user, isAdmin, isNirofyOnline, openAuthModal } = useAuth();

  // Mode state: 'bot' (default, playable right away!), 'multiplayer', or 'local'
  const [mode, setMode] = useState<ChessMode>('bot');
  const [difficulty, setDifficulty] = useState<Difficulty>('hard');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [boardFlipped, setBoardFlipped] = useState<boolean>(false);

  // Local / Bot Chess Engine instance
  const [chessInstance, setChessInstance] = useState<Chess>(new Chess());
  const [boardFen, setBoardFen] = useState<string>(new Chess().fen());
  const [moveHistory, setMoveHistory] = useState<Array<{ san: string; from: string; to: string; captured?: string }>>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Pawn Promotion Dialog State
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  // Online Multiplayer State
  const [activeGame, setActiveGame] = useState<ChessGame | null>(null);
  const [challenges, setChallenges] = useState<ChessChallenge[]>([]);
  const [timeControl, setTimeControl] = useState<number>(5);
  const [onlineClocks, setOnlineClocks] = useState<{ white: number; black: number }>({ white: 300, black: 300 });
  const [chessToast, setChessToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [showResignModal, setShowResignModal] = useState(false);

  const notify = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setChessToast({ message, type });
    setTimeout(() => setChessToast(null), 4500);
  };

  // Load online game and challenges
  const refreshOnlineData = async () => {
    if (!user) return;
    try {
      const [gameRes, chRes] = await Promise.all([api.getActiveGame(), api.getChallenges()]);
      if (gameRes.game) {
        setActiveGame(gameRes.game);
        setOnlineClocks({ white: gameRes.game.whiteTime, black: gameRes.game.blackTime });
        setMode('multiplayer');
      }
      setChallenges(chRes);
    } catch (e) {
      console.error('Error fetching online chess data:', e);
    }
  };

  useEffect(() => {
    refreshOnlineData();
  }, [user]);

  // WebSocket event listeners for live multiplayer
  useEffect(() => {
    if (!user) return;

    const unsubGameStarted = socket.on('chess:game_started', (game: ChessGame) => {
      setActiveGame(game);
      setMode('multiplayer');
      setOnlineClocks({ white: game.whiteTime, black: game.blackTime });
      sounds.playMove();
      const opponentName = game.whiteId === user.id ? game.blackName : game.whiteName;
      notify(`Match started against ${opponentName}!`, 'success');
    });

    const unsubGameUpdated = socket.on('chess:game_updated', (game: ChessGame) => {
      setActiveGame(game);
      setOnlineClocks({ white: game.whiteTime, black: game.blackTime });

      const chess = new Chess(game.fen);
      if (chess.inCheck()) {
        sounds.playCheck();
      } else if (game.moveHistory.length > 0 && game.moveHistory[game.moveHistory.length - 1].captured) {
        sounds.playCapture();
      } else {
        sounds.playMove();
      }
    });

    const unsubChallengeReceived = socket.on('chess:challenge_received', (ch: ChessChallenge) => {
      setChallenges((prev) => [ch, ...prev.filter((c) => c.id !== ch.id)]);
      sounds.playMessagePop();
      notify(`New match challenge received from ${ch.fromUsername}!`, 'info');
    });

    const unsubChallengeDeclined = socket.on('chess:challenge_declined', (ch: ChessChallenge) => {
      setChallenges((prev) => prev.filter((c) => c.id !== ch.id));
      notify(`${ch.toUsername} declined the chess challenge.`, 'info');
    });

    return () => {
      unsubGameStarted();
      unsubGameUpdated();
      unsubChallengeReceived();
      unsubChallengeDeclined();
    };
  }, [user]);

  // Multiplayer online clock timer
  useEffect(() => {
    if (mode !== 'multiplayer' || !activeGame || activeGame.status !== 'active') return;

    const interval = setInterval(() => {
      setOnlineClocks((prev) => {
        if (activeGame.turn === 'w') {
          return { ...prev, white: Math.max(0, prev.white - 1) };
        } else {
          return { ...prev, black: Math.max(0, prev.black - 1) };
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, activeGame]);

  // Reset local / bot game
  const resetLocalGame = (color: 'w' | 'b' = playerColor) => {
    const c = new Chess();
    setChessInstance(c);
    setBoardFen(c.fen());
    setMoveHistory([]);
    setSelectedSquare(null);
    setLegalTargets([]);
    setLastMove(null);
    setGameOverMessage(null);
    setPendingPromotion(null);
    setPlayerColor(color);
    setBoardFlipped(color === 'b');

    // If player chooses black, bot moves first!
    if (color === 'b' && mode === 'bot') {
      setTimeout(() => {
        makeBotMove(c, difficulty);
      }, 500);
    }
  };

  // Bot move algorithm with strict 5-second maximum thinking time
  const makeBotMove = (c: Chess, diff: Difficulty) => {
    if (c.isGameOver()) return;
    setIsBotThinking(true);

    // Natural human-like pause: Easy ~500ms, Medium ~800ms, Hard ~1100ms (capped so total <= 5s)
    const thinkingDelay = diff === 'easy' ? 450 : diff === 'medium' ? 700 : 1000;

    setTimeout(() => {
      try {
        // Enforce hard calculation limit so total elapsed time never exceeds 5s
        const remainingTime = Math.max(1000, 4800 - thinkingDelay);
        const chosenMove = getBestBotMove(c, diff, remainingTime);
        if (!chosenMove) {
          setIsBotThinking(false);
          return;
        }

        const res = c.move({
          from: chosenMove.from,
          to: chosenMove.to,
          promotion: chosenMove.promotion || 'q',
        });

        if (res) {
          setBoardFen(c.fen());
          setLastMove({ from: res.from, to: res.to });
          setMoveHistory((prev) => [
            ...prev,
            { san: res.san, from: res.from, to: res.to, captured: res.captured },
          ]);

          if (res.captured) sounds.playCapture();
          else if (c.inCheck()) sounds.playCheck();
          else sounds.playMove();

          checkGameOver(c);
        }
      } finally {
        setIsBotThinking(false);
      }
    }, 400);
  };

  const checkGameOver = (c: Chess) => {
    if (c.isGameOver()) {
      if (c.isCheckmate()) {
        const winner = c.turn() === 'w' ? 'Black' : 'White';
        setGameOverMessage(`Checkmate! ${winner} wins the game!`);
      } else if (c.isStalemate()) {
        setGameOverMessage('Draw by Stalemate!');
      } else if (c.isThreefoldRepetition()) {
        setGameOverMessage('Draw by Threefold Repetition!');
      } else if (c.isInsufficientMaterial()) {
        setGameOverMessage('Draw by Insufficient Material!');
      } else {
        setGameOverMessage('Game ended in a Draw!');
      }
    }
  };

  // Handle Square Click
  const handleSquareClick = async (square: string) => {
    if (pendingPromotion) return;

    // --- MULTIPLAYER MODE ---
    if (mode === 'multiplayer') {
      if (!activeGame || activeGame.status !== 'active' || !user) return;

      const isWhitePlayer = activeGame.whiteId === user.id;
      const isBlackPlayer = activeGame.blackId === user.id;
      if (!isWhitePlayer && !isBlackPlayer) return;

      const myColor = isWhitePlayer ? 'w' : 'b';
      if (activeGame.turn !== myColor) return;

      const chess = new Chess(activeGame.fen);

      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          setLegalTargets([]);
          return;
        }

        if (legalTargets.includes(square)) {
          const piece = chess.get(selectedSquare as Square);
          const isPromotion =
            piece?.type === 'p' &&
            ((piece.color === 'w' && square[1] === '8') || (piece.color === 'b' && square[1] === '1'));

          if (isPromotion) {
            setPendingPromotion({ from: selectedSquare, to: square });
            return;
          }

          try {
            const res = await api.makeMove(activeGame.id, selectedSquare, square);
            setActiveGame(res.game);
            setSelectedSquare(null);
            setLegalTargets([]);
          } catch (e: any) {
            console.error('Online move error:', e);
          }
          return;
        }
      }

      const piece = chess.get(square as Square);
      if (piece && piece.color === myColor) {
        setSelectedSquare(square);
        const moves = chess.moves({ square: square as Square, verbose: true });
        setLegalTargets(moves.map((m: any) => m.to));
      } else {
        setSelectedSquare(null);
        setLegalTargets([]);
      }
      return;
    }

    // --- BOT OR LOCAL MODE ---
    const c = chessInstance;
    if (c.isGameOver()) return;

    // In Bot mode, user can only move their own color
    if (mode === 'bot' && c.turn() !== playerColor) return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }

      if (legalTargets.includes(square)) {
        const piece = c.get(selectedSquare as Square);
        const isPromotion =
          piece?.type === 'p' &&
          ((piece.color === 'w' && square[1] === '8') || (piece.color === 'b' && square[1] === '1'));

        if (isPromotion) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        executeLocalMove(selectedSquare, square, 'q');
        return;
      }
    }

    const piece = c.get(square as Square);
    const currentColor = mode === 'local' ? c.turn() : playerColor;

    if (piece && piece.color === currentColor && (mode === 'local' || c.turn() === currentColor)) {
      setSelectedSquare(square);
      const moves = c.moves({ square: square as Square, verbose: true });
      setLegalTargets(moves.map((m: any) => m.to));
    } else {
      setSelectedSquare(null);
      setLegalTargets([]);
    }
  };

  const executeLocalMove = (from: string, to: string, promotion: string = 'q') => {
    const c = chessInstance;
    try {
      const res = c.move({ from, to, promotion });
      if (res) {
        setBoardFen(c.fen());
        setLastMove({ from: res.from, to: res.to });
        setMoveHistory((prev) => [
          ...prev,
          { san: res.san, from: res.from, to: res.to, captured: res.captured },
        ]);
        setSelectedSquare(null);
        setLegalTargets([]);
        setPendingPromotion(null);

        if (res.captured) sounds.playCapture();
        else if (c.inCheck()) sounds.playCheck();
        else sounds.playMove();

        checkGameOver(c);

        if (!c.isGameOver() && mode === 'bot') {
          makeBotMove(c, difficulty);
        }
      }
    } catch (e) {
      console.error('Local move error:', e);
    }
  };

  // Promotion choice submit
  const handlePromotionChoice = (promPiece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;
    if (mode === 'multiplayer' && activeGame) {
      api.makeMove(activeGame.id, pendingPromotion.from, pendingPromotion.to, promPiece)
        .then((res) => setActiveGame(res.game))
        .catch(() => {});
    } else {
      executeLocalMove(pendingPromotion.from, pendingPromotion.to, promPiece);
    }
    setPendingPromotion(null);
  };

  // Send multiplayer challenge
  const handleSendChallenge = async () => {
    if (!user) {
      openAuthModal('guest-login');
      return;
    }
    try {
      const ch = await api.createChallenge(isAdmin ? undefined : 'admin', timeControl);
      setChallenges((prev) => [ch, ...prev.filter((c) => c.id !== ch.id)]);
      notify(`Challenge sent to Nirofy (${timeControl} min)!`, 'success');
    } catch (err: any) {
      notify(err.message || 'Failed to send challenge', 'error');
    }
  };

  const handleRespondChallenge = async (challengeId: string, accept: boolean) => {
    try {
      const res = await api.respondToChallenge(challengeId, accept);
      setChallenges((prev) => prev.filter((c) => c.id !== challengeId));
      if (accept && res.game) {
        setActiveGame(res.game);
        setMode('multiplayer');
        notify('Match started! Make your first move.', 'success');
      }
    } catch (err: any) {
      notify(err.message || 'Failed to respond to challenge', 'error');
    }
  };

  // Current active FEN and turn
  const currentFen = mode === 'multiplayer' ? activeGame?.fen || new Chess().fen() : boardFen;
  const chess = new Chess(currentFen);
  const currentTurn = chess.turn();
  const isCheck = chess.inCheck();

  // Board flipping: Black at bottom if player is Black
  const isFlipped = boardFlipped || (mode === 'multiplayer' && activeGame && user && activeGame.blackId === user.id);
  const ranks = isFlipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const fileLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  // Calculate captured pieces
  const boardState = chess.board();
  const capturedPieces = { white: [] as string[], black: [] as string[] };
  const initialPieces: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const currentCounts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } as any, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } as any };

  boardState.forEach((row) => {
    row.forEach((cell) => {
      if (cell) currentCounts[cell.color][cell.type]++;
    });
  });

  for (const [type, count] of Object.entries(initialPieces)) {
    const missingWhite = count - currentCounts.w[type];
    for (let i = 0; i < missingWhite; i++) capturedPieces.white.push(type.toUpperCase());
    const missingBlack = count - currentCounts.b[type];
    for (let i = 0; i < missingBlack; i++) capturedPieces.black.push(type.toLowerCase());
  }

  const formatClock = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-8 pb-16">
      {/* In-App Toast Notification */}
      {chessToast && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-xl animate-fade-in ${
            chessToast.type === 'error'
              ? 'bg-rose-950/80 border-rose-600/80 text-rose-300'
              : chessToast.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300'
              : 'bg-sky-950/80 border-sky-600/80 text-sky-300'
          }`}
        >
          <span className="font-medium">{chessToast.message}</span>
          <button
            onClick={() => setChessToast(null)}
            className="hover:opacity-80 px-2 py-0.5 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Swords className="w-4 h-4" />
            <span>Interactive Live Chess Arena</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Play Live Chess</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Full rules engine, live multiplayer synchronization, move notation, and powerful tactical AI Bot.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode('bot')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              mode === 'bot'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Play vs AI Engine</span>
          </button>

          <button
            onClick={() => {
              setMode('multiplayer');
              if (!user) openAuthModal('guest-login');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              mode === 'multiplayer'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>Live Multiplayer</span>
          </button>

          <button
            onClick={() => setMode('local')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              mode === 'local'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Pass & Play / 2-Player</span>
          </button>
        </div>
      </div>

      {/* Pending Challenges Bar if any */}
      {challenges.length > 0 && (
        <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-800/60 space-y-2">
          <div className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pending Chess Challenges ({challenges.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {challenges.map((ch) => {
              const isToMe = ch.toUserId === user?.id || (isAdmin && ch.toUserId === 'admin');
              return (
                <div
                  key={ch.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{ch.fromUsername}</span>
                    <span className="text-slate-400"> challenged </span>
                    <span className="font-bold text-sky-400">{ch.toUsername}</span>
                    <span className="text-slate-500 ml-1">({ch.timeControl} min)</span>
                  </div>

                  {isToMe ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRespondChallenge(ch.id, true)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleRespondChallenge(ch.id, false)}
                        className="p-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic text-[11px]">Waiting for response...</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Chess Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left / Center: Board & Clocks */}
        <div className="lg:col-span-2 space-y-3">
          {/* Top Opponent Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-sky-400">
                {mode === 'bot' ? <Bot className="w-5 h-5 text-sky-400" /> : mode === 'multiplayer' ? 'M' : 'P2'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">
                    {mode === 'bot'
                      ? `AI Engine (${difficulty.toUpperCase()})`
                      : mode === 'multiplayer'
                      ? activeGame?.whiteId === user?.id
                        ? activeGame?.blackName
                        : activeGame?.whiteName
                      : 'Player 2 (Black)'}
                  </span>
                  {mode === 'bot' && isBotThinking && (
                    <span className="text-[10px] font-mono text-sky-400 animate-pulse">thinking...</span>
                  )}
                </div>
                {/* Captured pieces by top player */}
                <div className="flex items-center gap-1 text-sm text-amber-200">
                  {capturedPieces.white.map((p, i) => (
                    <span key={i} className="font-serif">{PIECE_SYMBOLS[p]}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Clock */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 font-mono text-sm font-bold text-slate-200 border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{mode === 'multiplayer' ? formatClock(onlineClocks.black) : '∞'}</span>
            </div>
          </div>

          {/* The Chessboard */}
          <div className="relative aspect-square w-full max-w-[530px] mx-auto rounded-3xl overflow-hidden border-4 border-slate-800/90 shadow-2xl bg-slate-900 select-none">
            <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
              {ranks.map((r) =>
                files.map((f) => {
                  const squareName = `${fileLetters[f]}${r + 1}`;
                  const piece = boardState[7 - r][f];
                  const isDark = (r + f) % 2 === 0;
                  const isSelected = selectedSquare === squareName;
                  const isLegal = legalTargets.includes(squareName);
                  const isLast = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
                  const isKingInCheck = isCheck && piece?.type === 'k' && piece?.color === currentTurn;

                  return (
                    <div
                      key={squareName}
                      onClick={() => handleSquareClick(squareName)}
                      className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                        isDark ? 'bg-slate-800' : 'bg-slate-700/60'
                      } ${isLast ? 'bg-sky-900/30' : ''} ${
                        isSelected ? 'bg-amber-500/25 ring-4 ring-inset ring-amber-400' : ''
                      } ${isKingInCheck ? 'bg-rose-600/50 animate-pulse' : ''}`}
                    >
                      {/* Square coordinates */}
                      {f === (isFlipped ? 7 : 0) && (
                        <span className="absolute top-0.5 left-1 text-[9px] font-mono text-slate-400 font-bold pointer-events-none">
                          {r + 1}
                        </span>
                      )}
                      {r === (isFlipped ? 7 : 0) && (
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-slate-400 font-bold pointer-events-none">
                          {fileLetters[f]}
                        </span>
                      )}

                      {/* Legal Move indicator: dot if empty, ring if capture */}
                      {isLegal && !piece && (
                        <span className="w-3.5 h-3.5 rounded-full bg-sky-400/80 shadow-md shadow-sky-500/50 pointer-events-none" />
                      )}
                      {isLegal && piece && (
                        <span className="absolute inset-1 rounded-xl ring-3 ring-rose-500/80 pointer-events-none" />
                      )}

                      {/* Chess Piece Symbol */}
                      {piece && (
                        <span
                          className={`text-3xl sm:text-4xl md:text-5xl font-serif drop-shadow-lg transition-transform hover:scale-110 pointer-events-none ${
                            piece.color === 'w' ? 'text-amber-100' : 'text-sky-300'
                          }`}
                        >
                          {PIECE_SYMBOLS[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Game Over Banner Overlay */}
            {gameOverMessage && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
                <Crown className="w-12 h-12 text-amber-400 animate-bounce" />
                <h3 className="text-xl sm:text-2xl font-bold text-white">{gameOverMessage}</h3>
                <button
                  onClick={() => resetLocalGame()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg cursor-pointer hover:scale-105 transition-transform"
                >
                  Play Again
                </button>
              </div>
            )}

            {/* Pawn Promotion Dialog Modal */}
            {pendingPromotion && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 text-center space-y-3 shadow-2xl">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Choose Promotion Piece
                  </span>
                  <div className="flex items-center gap-3">
                    {(['q', 'r', 'b', 'n'] as const).map((pieceType) => (
                      <button
                        key={pieceType}
                        onClick={() => handlePromotionChoice(pieceType)}
                        className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-2xl font-serif border border-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                      >
                        {PIECE_SYMBOLS[pieceType.toUpperCase()]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Player (You) Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-600/30 border border-sky-500/40 flex items-center justify-center font-bold text-xs text-sky-400">
                {user ? user.username.charAt(0).toUpperCase() : 'G'}
              </div>
              <div>
                <span className="font-bold text-sm text-white block">
                  {user ? `${user.username} (You)` : 'Guest Player'}
                </span>
                {/* Captured pieces by bottom player */}
                <div className="flex items-center gap-1 text-sm text-sky-400">
                  {capturedPieces.black.map((p, i) => (
                    <span key={i} className="font-serif">{PIECE_SYMBOLS[p]}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Clock */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 font-mono text-sm font-bold text-sky-400 border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{mode === 'multiplayer' ? formatClock(onlineClocks.white) : '∞'}</span>
            </div>
          </div>
        </div>

        {/* Right Pane: Match Controls, Moves, Settings */}
        <div className="space-y-4">
          {/* Mode Controls Card */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Match Configuration</span>
              </h3>
              <button
                onClick={() => setBoardFlipped(!boardFlipped)}
                className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700"
                title="Flip board perspective"
              >
                Flip Board
              </button>
            </div>

            {mode === 'bot' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Bot Difficulty
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'easy', label: 'Easy' },
                      { id: 'medium', label: 'Medium' },
                      { id: 'hard', label: 'Hard' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDifficulty(d.id as Difficulty)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                          difficulty === d.id
                            ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Play As
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => resetLocalGame('w')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold cursor-pointer ${
                        playerColor === 'w'
                          ? 'bg-amber-100 text-slate-950 font-bold'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      White ♔
                    </button>
                    <button
                      onClick={() => resetLocalGame('b')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold cursor-pointer ${
                        playerColor === 'b'
                          ? 'bg-sky-400 text-slate-950 font-bold'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Black ♚
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => resetLocalGame()}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Restart Match</span>
                </button>
              </div>
            )}

            {mode === 'multiplayer' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                  <div className="font-semibold text-amber-300">Live Match Against Nirofy</div>
                  <p className="text-[11px] text-slate-400">
                    Moves sync in real time across active browser sessions using server-authoritative WebSockets.
                  </p>
                </div>

                {!activeGame ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={timeControl}
                        onChange={(e) => setTimeControl(Number(e.target.value))}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value={3}>3 min (Blitz)</option>
                        <option value={5}>5 min (Rapid)</option>
                        <option value={10}>10 min (Classical)</option>
                      </select>
                      <button
                        onClick={handleSendChallenge}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
                      >
                        Send Challenge
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setShowResignModal(true)}
                      className="flex-1 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Resign</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'local' && (
              <div className="space-y-3 text-xs text-slate-300">
                <p>Pass and play with a friend on the same device. White and Black take alternating turns.</p>
                <button
                  onClick={() => resetLocalGame('w')}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Reset Board</span>
                </button>
              </div>
            )}
          </div>

          {/* Move History */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Move Notation (SAN)
              </h4>
              <span className="text-[10px] font-mono text-sky-400">
                Turn: {currentTurn === 'w' ? 'White' : 'Black'}
              </span>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1 font-mono text-xs text-slate-300 pr-1 scrollbar-thin">
              {moveHistory.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {moveHistory.map((mv, idx) => (
                    <div key={idx} className="flex items-center justify-between py-0.5 border-b border-slate-800/40">
                      <span className="text-slate-500 text-[10px]">{Math.floor(idx / 2) + 1}.{idx % 2 === 0 ? '' : '..'}</span>
                      <span className="font-bold text-slate-200">{mv.san}</span>
                      {mv.captured && <span className="text-[10px] text-rose-400 font-serif">x{PIECE_SYMBOLS[mv.captured.toLowerCase()]}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4 italic text-xs">
                  Moves will record here as you play.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resign Confirmation Modal */}
      {showResignModal && activeGame && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <Flag className="w-5 h-5" />
              <span>Resign Match?</span>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to forfeit this live match? Your opponent will be awarded the victory immediately.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResignModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Continue Playing
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.resignGame(activeGame.id);
                    notify('You resigned the match.', 'info');
                  } catch (err: any) {
                    notify(err.message || 'Failed to resign match', 'error');
                  } finally {
                    setShowResignModal(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Yes, Resign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
