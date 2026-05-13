import { useState, useEffect } from 'react';
import { User, CryptoAsset, CryptoPrice } from '@/types';
import { Wallet, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, Coins, Trophy, History, Lock, DollarSign } from 'lucide-react';
import { getTransactions, getGameHistory } from '@/lib/storage';
import { vibrate } from '@aippy/runtime/device';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig);

interface WalletSectionProps {
  user: User;
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
}

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP'];

export function WalletSection({ user, onDeposit, onWithdraw }: WalletSectionProps) {
  const [activeTab, setActiveTab] = useState<'balance' | 'trading' | 'transactions' | 'history'>('balance');
  const [amount, setAmount] = useState(100);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([]);
  const [portfolio, setPortfolio] = useState<CryptoAsset[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [tradeAmount, setTradeAmount] = useState(100);
  const [maxContext, setMaxContext] = useState<'wallet' | 'bank'>('wallet');
  
  const balanceMax = user.balance;
  const bankMax = user.bankBalance;
  
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  
  const transactions = getTransactions();
  const history = getGameHistory();
  
  const walletUnlocked = user.vipLevel >= 7;
  const tradingUnlocked = walletUnlocked && user.hasDeposited;
  
  useEffect(() => {
    const storedPortfolio = localStorage.getItem('crypto_portfolio');
    if (storedPortfolio) {
      setPortfolio(JSON.parse(storedPortfolio));
    }
    
    const initialPrices: CryptoPrice[] = CRYPTO_SYMBOLS.map(symbol => ({
      symbol,
      price: Math.random() * 50000 + 1000,
      change24h: (Math.random() - 0.5) * 20,
    }));
    setCryptoPrices(initialPrices);
    
    const interval = setInterval(() => {
      setCryptoPrices(prev => prev.map(crypto => ({
        ...crypto,
        price: crypto.price * (1 + (Math.random() - 0.5) * 0.02),
        change24h: crypto.change24h + (Math.random() - 0.5) * 2,
      })));
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);
  
  const handleDeposit = () => {
    if (user.vipLevel < 10) {
      if (enableHaptics) vibrate([100, 50, 100]);
      return;
    }
    if (amount <= user.balance) {
      onDeposit(amount);
      if (enableHaptics) vibrate(100);
    }
  };
  
  const handleWithdraw = () => {
    if (amount <= user.bankBalance) {
      onWithdraw(amount);
      if (enableHaptics) vibrate(100);
    }
  };
  
  const buyCrypto = (symbol: string) => {
    const crypto = cryptoPrices.find(c => c.symbol === symbol);
    if (!crypto || tradeAmount > user.bankBalance) {
      if (enableHaptics) vibrate([100, 50, 100]);
      return;
    }
    
    const amountToBuy = tradeAmount / crypto.price;
    
    setPortfolio(prev => {
      const existing = prev.find(p => p.symbol === symbol);
      if (existing) {
        const newAmount = existing.amount + amountToBuy;
        const newAvgPrice = ((existing.avgBuyPrice * existing.amount) + (crypto.price * amountToBuy)) / newAmount;
        return prev.map(p => p.symbol === symbol ? { ...p, amount: newAmount, avgBuyPrice: newAvgPrice } : p);
      } else {
        return [...prev, {
          id: self.crypto?.randomUUID ? self.crypto.randomUUID() : Math.random().toString(36).substring(2),
          symbol,
          name: symbol,
          amount: amountToBuy,
          avgBuyPrice: crypto.price,
        }];
      }
    });
    
    onWithdraw(tradeAmount); // Deduction from bank balance
    if (enableHaptics) vibrate(100);
    setSelectedCrypto(null);
  };
  
  const sellCrypto = (symbol: string, sellAmount?: number) => {
    const crypto = cryptoPrices.find(c => c.symbol === symbol);
    const asset = portfolio.find(p => p.symbol === symbol);
    if (!crypto || !asset) return;
    
    const amountToSell = sellAmount || asset.amount;
    const sellValue = amountToSell * crypto.price;
    
    if (amountToSell >= asset.amount) {
      setPortfolio(prev => prev.filter(p => p.symbol !== symbol));
    } else {
      setPortfolio(prev => prev.map(p => 
        p.symbol === symbol 
          ? { ...p, amount: p.amount - amountToSell }
          : p
      ));
    }
    
    onDeposit(sellValue); // Return to bank balance
    if (enableHaptics) vibrate(100);
    setSelectedCrypto(null);
  };
  
  const portfolioValue = portfolio.reduce((sum, asset) => {
    const price = cryptoPrices.find(c => c.symbol === asset.symbol)?.price || 0;
    return sum + (asset.amount * price);
  }, 0);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a0a1f] to-[#0f0a1a] p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <Wallet className="size-8" style={{ color: primaryAccent }} />
        <h2 className="text-4xl font-black text-white">Wallet</h2>
      </div>
      
      {!walletUnlocked && (
        <div className="mb-8 p-8 rounded-2xl border-2 text-center" style={{ backgroundColor: cardBg, borderColor: '#ff0000', boxShadow: '0 0 40px #ff000020' }}>
          <Lock className="size-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-2xl font-black text-white mb-3">Wallet Locked</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Reach VIP level 7 to unlock Wallet and access deposits, withdrawals, and crypto trading.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Trophy className="size-6" style={{ color: primaryAccent }} />
            <span className="text-xl font-bold text-white">Current VIP: {user.vipLevel} / 7</span>
          </div>
        </div>
      )}
      
      {walletUnlocked && (
        <>
          <div className="mb-8 p-6 rounded-2xl border-2 relative overflow-hidden" style={{ backgroundColor: cardBg, borderColor: `${primaryAccent}40`, boxShadow: `0 0 40px ${primaryAccent}20` }}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div 
                  onClick={() => setMaxContext('wallet')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${maxContext === 'wallet' ? 'bg-white/10' : 'bg-black/30'}`}
                  style={{ borderColor: maxContext === 'wallet' ? primaryAccent : 'rgba(255,255,255,0.1)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="size-5" style={{ color: primaryAccent }} />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Game Balance</span>
                  </div>
                  <div className="text-3xl font-black text-white">{user.balance.toFixed(2)}</div>
                </div>
                
                <div 
                  onClick={() => setMaxContext('bank')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${maxContext === 'bank' ? 'bg-white/10' : 'bg-black/30'}`}
                  style={{ borderColor: maxContext === 'bank' ? primaryAccent : 'rgba(255,255,255,0.1)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="size-5" style={{ color: primaryAccent }} />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bank Balance</span>
                  </div>
                  <div className="text-3xl font-black text-white">{user.bankBalance.toFixed(2)}</div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Amount</label>
                  <button 
                    onClick={() => setAmount(maxContext === 'wallet' ? user.balance : user.bankBalance)}
                    className="text-xs font-black px-2 py-1 rounded bg-gray-700 text-white active:scale-90"
                    style={{ color: primaryAccent }}
                  >
                    MAX
                  </button>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-5 py-4 rounded-xl bg-black/50 border-2 text-white font-bold text-lg focus:outline-none focus:ring-2 transition-all"
                  style={{ borderColor: `${primaryAccent}60`, boxShadow: `0 0 15px ${primaryAccent}20` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleDeposit}
                  disabled={amount > user.balance}
                  className="flex items-center justify-center gap-2 py-4 rounded-xl font-black text-black transition-all active:scale-95 disabled:opacity-50 shadow-lg"
                  style={{ backgroundColor: primaryAccent, boxShadow: `0 0 20px ${primaryAccent}40` }}
                >
                  <ArrowUpCircle className="size-5" />
                  Deposit
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={amount > user.bankBalance}
                  className="flex items-center justify-center gap-2 py-4 rounded-xl font-black bg-gray-700/80 text-white transition-all active:scale-95 disabled:opacity-50 border-2 border-gray-600"
                >
                  <ArrowDownCircle className="size-5" />
                  Withdraw
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {[
              { key: 'balance', label: 'Balance', icon: Coins },
              { key: 'trading', label: 'Trading', icon: TrendingUp, locked: !tradingUnlocked },
              { key: 'transactions', label: 'Transactions', icon: History },
              { key: 'history', label: 'History', icon: Trophy },
            ].map(({ key, label, icon: Icon, locked }) => (
              <button
                key={key}
                onClick={() => !locked && setActiveTab(key as typeof activeTab)}
                disabled={locked}
                className="flex-1 py-3 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 border-2 whitespace-nowrap disabled:opacity-50"
                style={{
                  backgroundColor: activeTab === key ? primaryAccent : cardBg,
                  color: activeTab === key ? '#000' : '#fff',
                  borderColor: activeTab === key ? primaryAccent : `${primaryAccent}40`,
                  boxShadow: activeTab === key ? `0 0 20px ${primaryAccent}40` : 'none',
                }}
              >
                {locked && <Lock className="size-4" />}
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          
          {activeTab === 'balance' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl border-2" style={{ backgroundColor: cardBg, borderColor: `${primaryAccent}40`, boxShadow: `0 0 30px ${primaryAccent}20` }}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="size-6" style={{ color: primaryAccent }} />
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Wagered</span>
                </div>
                <div className="text-3xl font-black text-white">{user.totalWagered.toFixed(0)}</div>
              </div>
              
              <div className="p-6 rounded-2xl border-2" style={{ backgroundColor: cardBg, borderColor: `${primaryAccent}40`, boxShadow: `0 0 30px ${primaryAccent}20` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="size-6" style={{ color: primaryAccent }} />
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Games</span>
                </div>
                <div className="text-3xl font-black text-white">{history.length}</div>
              </div>
            </div>
          )}
          
          {activeTab === 'trading' && tradingUnlocked && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl border-2" style={{ backgroundColor: cardBg, borderColor: `${primaryAccent}40`, boxShadow: `0 0 30px ${primaryAccent}20` }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Crypto Portfolio</div>
                    <div className="text-3xl font-black text-white mt-1">{portfolioValue.toFixed(2)}</div>
                  </div>
                  <TrendingUp className="size-8" style={{ color: primaryAccent }} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {cryptoPrices.map(crypto => {
                  const asset = portfolio.find(p => p.symbol === crypto.symbol);
                  const isPositive = crypto.change24h >= 0;
                  
                  return (
                    <div
                      key={crypto.symbol}
                      onClick={() => setSelectedCrypto(crypto.symbol)}
                      className="p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-95"
                      style={{ backgroundColor: cardBg, borderColor: `${primaryAccent}20`, boxShadow: `0 0 15px ${primaryAccent}10` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-black text-white text-lg">{crypto.symbol}</div>
                        <div className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {isPositive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                          {Math.abs(crypto.change24h).toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-white mb-2">${crypto.price.toFixed(2)}</div>
                      {asset && (
                        <div className="text-xs text-gray-400">
                          Owned: {asset.amount.toFixed(4)} ({(asset.amount * crypto.price).toFixed(2)})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {selectedCrypto && (
                <div className="p-6 rounded-2xl border-2" style={{ backgroundColor: cardBg, borderColor: primaryAccent, boxShadow: `0 0 30px ${primaryAccent}40` }}>
                  <h3 className="text-xl font-black text-white mb-4">Trade {selectedCrypto}</h3>
                  
                  {portfolio.find(p => p.symbol === selectedCrypto) && (
                    <div className="mb-4 p-3 rounded-xl bg-black/30 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Owned</div>
                      <div className="text-lg font-bold text-white">
                        {portfolio.find(p => p.symbol === selectedCrypto)!.amount.toFixed(4)} {selectedCrypto}
                      </div>
                      <div className="text-sm" style={{ color: primaryAccent }}>
                        ≈ {(portfolio.find(p => p.symbol === selectedCrypto)!.amount * (cryptoPrices.find(c => c.symbol === selectedCrypto)?.price || 0)).toFixed(2)}
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-gray-400">Amount (in $)</label>
                      <button 
                        onClick={() => setTradeAmount(user.bankBalance)}
                        className="text-xs font-black px-2 py-1 rounded bg-gray-700 text-white active:scale-90"
                        style={{ color: primaryAccent }}
                      >
                        MAX
                      </button>
                    </div>
                    <input
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold text-lg focus:outline-none"
                      style={{ borderColor: `${primaryAccent}60` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <button
                      onClick={() => buyCrypto(selectedCrypto)}
                      disabled={tradeAmount > user.bankBalance}
                      className="py-3 rounded-xl font-black text-black transition-all active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: primaryAccent }}
                    >
                      Buy
                    </button>
                    {portfolio.find(p => p.symbol === selectedCrypto) && (
                      <button
                        onClick={() => {
                          const asset = portfolio.find(p => p.symbol === selectedCrypto);
                          const crypto = cryptoPrices.find(c => c.symbol === selectedCrypto);
                          if (asset && crypto) {
                            const amountToSell = tradeAmount / crypto.price;
                            if (amountToSell <= asset.amount) {
                              sellCrypto(selectedCrypto, amountToSell);
                            } else {
                              if (enableHaptics) vibrate([100, 50, 100]);
                            }
                          }
                        }}
                        className="py-3 rounded-xl font-bold bg-orange-500 text-white transition-all active:scale-95"
                      >
                        Sell
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {portfolio.find(p => p.symbol === selectedCrypto) && (
                      <button
                        onClick={() => sellCrypto(selectedCrypto)}
                        className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white transition-all active:scale-95"
                      >
                        Sell All
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCrypto(null)}
                      className="flex-1 py-3 rounded-xl font-bold bg-gray-700 text-white transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'trading' && !tradingUnlocked && (
            <div className="p-8 rounded-2xl border-2 text-center" style={{ backgroundColor: cardBg, borderColor: '#ff0000', boxShadow: '0 0 40px #ff000020' }}>
              <Lock className="size-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-2xl font-black text-white mb-3">Trading Locked</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Make your first deposit (VIP 10 required) to unlock crypto trading.
              </p>
            </div>
          )}
          
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              {transactions.slice(0, 20).map((tx) => (
                <div
                  key={tx.id}
                  className="p-5 rounded-xl flex items-center justify-between border-2"
                  style={{ backgroundColor: cardBg, borderColor: `${primaryAccent}20`, boxShadow: `0 0 15px ${primaryAccent}10` }}
                >
                  <div>
                    <div className="font-bold text-white text-lg">{tx.type}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(tx.timestamp).toLocaleString()}</div>
                    {tx.game && <div className="text-xs font-semibold mt-1" style={{ color: primaryAccent }}>{tx.game}</div>}
                  </div>
                  <div className={`font-black text-xl ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="space-y-3">
              {history.slice(0, 20).map((h) => (
                <div
                  key={h.id}
                  className="p-5 rounded-xl border-2"
                  style={{ backgroundColor: cardBg, borderColor: `${primaryAccent}20`, boxShadow: `0 0 15px ${primaryAccent}10` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-black text-white text-lg">{h.game}</div>
                    <div className={`font-black text-lg px-3 py-1 rounded-lg ${h.result === 'win' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {h.result === 'win' ? 'Win' : 'Loss'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 font-semibold">Bet: <span className="text-white font-bold">{h.betAmount.toFixed(2)}</span></span>
                    {h.result === 'win' && (
                      <span className="font-bold" style={{ color: primaryAccent }}>
                        Win: {h.payout.toFixed(2)} ({h.multiplier.toFixed(2)}x)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{new Date(h.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}