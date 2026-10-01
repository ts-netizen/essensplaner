import { useState } from 'react';
import { HouseholdProvider } from './context/HouseholdContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { MealPlannerScreen } from './components/screens/MealPlannerScreen';
import { ShoppingListScreen } from './components/screens/ShoppingListScreen';
import { RecipeCatalogScreen } from './components/screens/RecipeCatalogScreen';
import { RecipeDetailScreen } from './components/screens/RecipeDetailScreen';
import { PantryScreen } from './components/screens/PantryScreen';
import { NutritionExplorerScreen } from './components/screens/NutritionExplorerScreen';
import { SocialFriendsScreen } from './components/screens/SocialFriendsScreen';
import { HouseholdSettingsScreen } from './components/screens/HouseholdSettingsScreen';
import { SmartIngestionModal } from './components/modals/SmartIngestionModal';

function MainApp() {
  const [currentScreen, setCurrentScreen] = useState<string>('dashboard');
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState<boolean>(false);

  const handleNavigate = (screen: string, params?: { recipeId?: string }) => {
    if (params?.recipeId) {
      setActiveRecipeId(params.recipeId);
    }
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenRecipeDetail = (recipeId: string) => {
    setActiveRecipeId(recipeId);
    setCurrentScreen('recipe-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AppShell
      currentScreen={currentScreen}
      onNavigate={(s) => handleNavigate(s)}
      onOpenImport={() => setIsIngestionModalOpen(true)}
    >
      {currentScreen === 'dashboard' && (
        <DashboardScreen
          onNavigate={(s, params) => handleNavigate(s, params)}
          onOpenImport={() => setIsIngestionModalOpen(true)}
        />
      )}

      {currentScreen === 'planner' && (
        <MealPlannerScreen
          onNavigate={(s, params) => handleNavigate(s, params)}
        />
      )}

      {currentScreen === 'shopping' && <ShoppingListScreen />}

      {currentScreen === 'catalog' && (
        <RecipeCatalogScreen
          onSelectRecipe={handleOpenRecipeDetail}
          onOpenImport={() => setIsIngestionModalOpen(true)}
        />
      )}

      {currentScreen === 'recipe-detail' && activeRecipeId && (
        <RecipeDetailScreen
          recipeId={activeRecipeId}
          onBack={() => handleNavigate('catalog')}
          onNavigateToPlanner={() => handleNavigate('planner')}
        />
      )}

      {currentScreen === 'pantry' && (
        <PantryScreen onNavigateToShopping={() => handleNavigate('shopping')} />
      )}

      {currentScreen === 'nutrition' && <NutritionExplorerScreen />}

      {currentScreen === 'social' && (
        <SocialFriendsScreen
          onNavigateToRecipe={handleOpenRecipeDetail}
        />
      )}

      {currentScreen === 'settings' && <HouseholdSettingsScreen />}

      {/* Smart Ingestion Modal (Multimodal) */}
      <SmartIngestionModal
        isOpen={isIngestionModalOpen}
        onClose={() => setIsIngestionModalOpen(false)}
        onRecipeSaved={(recipeId) => handleOpenRecipeDetail(recipeId)}
      />
    </AppShell>
  );
}

export default function App() {
  return (
    <HouseholdProvider>
      <MainApp />
    </HouseholdProvider>
  );
}
