import React, { useState } from 'react';
import {
  Home,
  CalendarDays,
  ShoppingBag,
  BookOpen,
  Archive,
  Sparkles,
  Users,
  Settings,
  Plus,
  Wifi,
  WifiOff,
  Menu,
  X,
  Apple,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';

interface AppShellProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onOpenImport: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentScreen,
  onNavigate,
  onOpenImport,
  children,
}) => {
  const { household, shoppingList, isOnline, isDemo } = useHousehold();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const uncheckedShoppingCount = shoppingList.filter((i) => !i.checked).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'planner', label: 'Wochenplan', icon: CalendarDays },
    {
      id: 'shopping',
      label: 'Einkaufsliste',
      icon: ShoppingBag,
      badge: uncheckedShoppingCount > 0 ? uncheckedShoppingCount : undefined,
    },
    { id: 'catalog', label: 'Rezepte', icon: BookOpen },
    { id: 'pantry', label: 'Vorratskammer', icon: Archive },
    { id: 'nutrition', label: 'Ernährungswissen', icon: Apple },
    { id: 'social', label: 'Freunde', icon: Users },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ];

  // Mobile Bottom Bar has the 5 primary tabs
  const bottomBarItems = [
    { id: 'dashboard', label: 'Heute', icon: Home },
    { id: 'planner', label: 'Planer', icon: CalendarDays },
    {
      id: 'shopping',
      label: 'Einkauf',
      icon: ShoppingBag,
      badge: uncheckedShoppingCount > 0 ? uncheckedShoppingCount : undefined,
    },
    { id: 'catalog', label: 'Rezepte', icon: BookOpen },
    { id: 'more', label: 'Mehr', icon: Menu },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 p-5 shrink-0 justify-between sticky top-0 h-screen">
        <div className="space-y-6">
          {/* Logo & Household Name */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-slate-800 text-base tracking-tight truncate">
                Essensplaner
              </h2>
              <span className="text-xs text-emerald-600 font-bold block truncate">
                {household.name}
              </span>
            </div>
          </div>

          {/* Quick Import Button */}
          <button
            onClick={onOpenImport}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span>Rezept importieren</span>
          </button>

          {/* Nav List */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentScreen === item.id ||
                (item.id === 'catalog' && currentScreen === 'recipe-detail');
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-bold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-emerald-600 stroke-[2.5]' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-2xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sync Status Badge */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs px-2 text-slate-500">
            <span className="flex items-center gap-1.5">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-emerald-700">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold text-amber-700">Offline</span>
                </>
              )}
            </span>
            {isDemo && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                Lokal / Demo
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-black text-slate-800 text-sm tracking-tight">Essensplaner</h1>
            <span className="text-[10px] font-bold text-emerald-600 block">{household.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImport}
            className="p-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="p-1.5">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-600" />
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0 max-w-full">
        {children}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {bottomBarItems.map((item) => {
          const Icon = item.icon;
          const isMore = item.id === 'more';
          const isActive =
            !isMore &&
            (currentScreen === item.id ||
              (item.id === 'catalog' && currentScreen === 'recipe-detail'));

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isMore) {
                  setMobileMenuOpen(!mobileMenuOpen);
                } else {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                isActive ? 'text-emerald-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-600 text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MOBILE "MORE" OVERLAY MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-fade-in">
          <div className="bg-white rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-base">Weitere Bereiche</h3>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  onNavigate('pantry');
                  setMobileMenuOpen(false);
                }}
                className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center text-center space-y-2 hover:bg-emerald-50 transition-colors"
              >
                <Archive className="w-6 h-6 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Vorratskammer</span>
              </button>

              <button
                onClick={() => {
                  onNavigate('nutrition');
                  setMobileMenuOpen(false);
                }}
                className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center text-center space-y-2 hover:bg-emerald-50 transition-colors"
              >
                <Apple className="w-6 h-6 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">Ernährungswissen</span>
              </button>

              <button
                onClick={() => {
                  onNavigate('social');
                  setMobileMenuOpen(false);
                }}
                className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center text-center space-y-2 hover:bg-emerald-50 transition-colors"
              >
                <Users className="w-6 h-6 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">Freunde & Pläne</span>
              </button>

              <button
                onClick={() => {
                  onNavigate('settings');
                  setMobileMenuOpen(false);
                }}
                className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center text-center space-y-2 hover:bg-emerald-50 transition-colors"
              >
                <Settings className="w-6 h-6 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">Einstellungen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
