/**
 * Sidebar Component
 * Control panel for bottle parameters and lineup settings
 */

import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { AnimatePresence, motion } from 'framer-motion';
import BottleGenerator from '../bottle-generator/BottleGenerator';
import SeriesGenerator from '../lineup-builder/SeriesGenerator';
import PortfolioManager from '../lineup-builder/PortfolioManager';
import BatchEditor from '../lineup-builder/BatchEditor';
import HeroBottleEditor from '../lineup-builder/HeroBottleEditor';
import SeriesSelector from '../comparison-mode/SeriesSelector';
import PresetLibrary from '../presets/PresetLibrary';
import ExportPanel from '../export/ExportPanel';
import FillSimulatorControls from '../fill-simulator/FillSimulatorControls';

type LineupSubTab = 'portfolios' | 'generate' | 'batch' | 'individual';

export default function Sidebar() {
  const { ui, setHeroBottle } = useStore();
  const [lineupSubTab, setSubTab] = useState<LineupSubTab>('portfolios');

  // A hero picked by clicking a bottle in the 3D view opens Edit Bottle
  useEffect(() => {
    if (ui.heroBottleId) setSubTab('individual');
  }, [ui.heroBottleId]);

  // The hero focus only lives in Edit Bottle
  const setLineupSubTab = (tab: LineupSubTab) => {
    if (tab !== 'individual') setHeroBottle(null);
    setSubTab(tab);
  };

  const renderContent = () => {
    switch (ui.activeTab) {
      case 'generator':
        return <BottleGenerator />;
      case 'lineup':
        return (
          <div className="space-y-4">
            {/* Sub-tab navigation */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <SubTabButton
                active={lineupSubTab === 'portfolios'}
                onClick={() => setLineupSubTab('portfolios')}
                label="Portfolios"
              />
              <SubTabButton
                active={lineupSubTab === 'generate'}
                onClick={() => setLineupSubTab('generate')}
                label="Generate"
              />
              <SubTabButton
                active={lineupSubTab === 'batch'}
                onClick={() => setLineupSubTab('batch')}
                label="Batch Edit"
              />
              <SubTabButton
                active={lineupSubTab === 'individual'}
                onClick={() => setLineupSubTab('individual')}
                label="Edit Bottle"
              />
            </div>

            {/* Sub-tab content */}
            {lineupSubTab === 'portfolios' && <PortfolioManager />}
            {lineupSubTab === 'generate' && <SeriesGenerator />}
            {lineupSubTab === 'batch' && <BatchEditor />}
            {lineupSubTab === 'individual' && <HeroBottleEditor />}
          </div>
        );
      case 'comparison':
        return <SeriesSelector />;
      case 'presets':
        return <PresetLibrary />;
      case 'export':
        return <ExportPanel />;
      case 'fill':
        return <FillSimulatorControls />;
      default:
        return <BottleGenerator />;
    }
  };

  return (
    <AnimatePresence>
      {ui.sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 360, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white border-r border-gray-200 overflow-hidden shrink-0"
        >
          <div className="w-[360px] h-full overflow-y-auto p-4">
            {renderContent()}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-tab Button ───────────────────────────────────────────────────

interface SubTabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function SubTabButton({ active, onClick, label }: SubTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
        ${active
          ? 'bg-white shadow-sm text-gray-900'
          : 'text-gray-500 hover:text-gray-700'
        }
      `}
    >
      {label}
    </button>
  );
}
