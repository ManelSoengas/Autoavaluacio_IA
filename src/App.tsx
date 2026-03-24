/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  ChevronRight, 
  ChevronDown, 
  BrainCircuit, 
  GraduationCap, 
  ClipboardCheck,
  Sparkles,
  RefreshCcw,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// --- Types ---

interface AssessmentItem {
  id: string;
  text: string;
  weight: number;
  isCritical: boolean;
  dimension: string;
}

type Scenario = 'teacher' | 'student';

interface AssessmentState {
  [scenario: string]: {
    [itemId: string]: boolean | null;
  };
}

// --- Data ---

const DIMENSIONS = [
  "Dimensió 1 · Coneixement i Ètica",
  "Dimensió 2 · Propòsit",
  "Dimensió 3 · Intervenció",
  "Dimensió 4 · Resultat final"
];

const ITEMS: AssessmentItem[] = [
  // Dimensió 1
  { id: 'd1_1', text: 'Entenc com genera respostes la IA (predicció, no coneixement)?', weight: 2, isCritical: false, dimension: DIMENSIONS[0] },
  { id: 'd1_2', text: 'Sóc conscient que la IA pot generar errors o al·lucinacions?', weight: 2, isCritical: true, dimension: DIMENSIONS[0] },
  { id: 'd1_3', text: 'Sóc conscient que la IA pot introduir biaixos?', weight: 2, isCritical: true, dimension: DIMENSIONS[0] },
  { id: 'd1_4', text: 'Contrasto la informació amb altres fonts abans d’utilitzar-la?', weight: 3, isCritical: true, dimension: DIMENSIONS[0] },
  { id: 'd1_5', text: 'Conec les limitacions de l’eina que utilitzaré?', weight: 2, isCritical: false, dimension: DIMENSIONS[0] },
  { id: 'd1_6', text: 'Sé per a quines tasques és adequada i per a quines no?', weight: 2, isCritical: false, dimension: DIMENSIONS[0] },
  { id: 'd1_7', text: 'Sé construir indicacions clares?', weight: 1, isCritical: false, dimension: DIMENSIONS[0] },
  { id: 'd1_8', text: 'Conec les condicions d’ús i tractament de dades?', weight: 3, isCritical: true, dimension: DIMENSIONS[0] },
  { id: 'd1_9', text: 'Evito introduir dades personals o sensibles?', weight: 3, isCritical: true, dimension: DIMENSIONS[0] },
  { id: 'd1_10', text: 'He rebut formació, formal o autodidacta, sobre ús educatiu de la IA?', weight: 2, isCritical: false, dimension: DIMENSIONS[0] },
  { id: 'd1_11', text: 'Puc explicar els límits, riscos i usos adequats de la IA a altres?', weight: 2, isCritical: false, dimension: DIMENSIONS[0] },
  
  // Dimensió 2
  { id: 'd2_1', text: 'He definit clarament per a què utilitzo la IA?', weight: 2, isCritical: false, dimension: DIMENSIONS[1] },
  { id: 'd2_2', text: 'L’ús de la IA aporta un valor real respecte a fer-ho manualment?', weight: 2, isCritical: false, dimension: DIMENSIONS[1] },
  { id: 'd2_3', text: 'L’ús de la IA està alineat amb els objectius d’aprenentatge i el currículum?', weight: 3, isCritical: true, dimension: DIMENSIONS[1] },
  { id: 'd2_4', text: 'L’ús de la IA millora la qualitat pedagògica i no només l’eficiència?', weight: 2, isCritical: false, dimension: DIMENSIONS[1] },
  
  // Dimensió 3
  { id: 'd3_1', text: 'Reviso críticament els resultats abans d’utilitzar-los?', weight: 3, isCritical: true, dimension: DIMENSIONS[2] },
  { id: 'd3_2', text: 'Adapto els continguts al context i nivell de l’alumnat?', weight: 2, isCritical: false, dimension: DIMENSIONS[2] },
  { id: 'd3_3', text: 'Verifico la fiabilitat i exactitud de la informació generada?', weight: 3, isCritical: true, dimension: DIMENSIONS[2] },
  { id: 'd3_4', text: 'Detecto i corregeixo possibles errors o biaixos?', weight: 3, isCritical: true, dimension: DIMENSIONS[2] },
  { id: 'd3_5', text: 'Utilitzo indicacions clares i ajustades per obtenir resultats útils?', weight: 1, isCritical: false, dimension: DIMENSIONS[2] },
  { id: 'd3_6', text: 'Evito una dependència excessiva de la IA en el procés de creació?', weight: 2, isCritical: false, dimension: DIMENSIONS[2] },
  { id: 'd3_7', text: 'Puc explicar i justificar com he utilitzat la IA en el procés?', weight: 2, isCritical: false, dimension: DIMENSIONS[2] },
  
  // Dimensió 4
  { id: 'd4_1', text: 'El material final és correcte, coherent i comprensible?', weight: 3, isCritical: true, dimension: DIMENSIONS[3] },
  { id: 'd4_2', text: 'És pedagògicament adequat per als objectius plantejats?', weight: 3, isCritical: true, dimension: DIMENSIONS[3] },
  { id: 'd4_3', text: 'Fomenta aprenentatge significatiu i no només reproductiu?', weight: 2, isCritical: false, dimension: DIMENSIONS[3] },
  { id: 'd4_4', text: 'Evita errors conceptuals o simplificacions inadequades?', weight: 3, isCritical: true, dimension: DIMENSIONS[3] },
  { id: 'd4_5', text: 'El resultat final és millor que el que hauria produït sense IA?', weight: 2, isCritical: false, dimension: DIMENSIONS[3] },
];

// --- Components ---

export default function App() {
  const [scenario, setScenario] = useState<Scenario>('teacher');
  const [answers, setAnswers] = useState<AssessmentState>({
    teacher: {},
    student: {}
  });
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleToggle = (itemId: string, value: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [scenario]: {
        ...prev[scenario],
        [itemId]: prev[scenario][itemId] === value ? null : value
      }
    }));
    setAiAnalysis(null); // Reset analysis on change
  };

  const currentAnswers = answers[scenario];
  
  const stats = useMemo(() => {
    let totalWeight = 0;
    let earnedWeight = 0;
    let criticalFails = 0;
    let answeredCount = 0;

    ITEMS.forEach(item => {
      totalWeight += item.weight;
      if (currentAnswers[item.id] === true) {
        earnedWeight += item.weight;
      } else if (currentAnswers[item.id] === false && item.isCritical) {
        criticalFails++;
      }
      if (currentAnswers[item.id] !== undefined && currentAnswers[item.id] !== null) {
        answeredCount++;
      }
    });

    const score = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
    const isReady = answeredCount === ITEMS.length;
    const canProceed = isReady && criticalFails === 0;

    return { score, criticalFails, isReady, canProceed, answeredCount };
  }, [currentAnswers]);

  const generateAIReport = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analitza aquest perfil d'autoavaluació docent sobre l'ús de la IA.
        Escenari: ${scenario === 'teacher' ? 'Gestió i creació de continguts' : 'Activitats per a l\'alumnat'}
        Puntuació: ${stats.score.toFixed(1)}%
        Punts crítics fallats: ${stats.criticalFails}
        
        Respostes negatives (No):
        ${ITEMS.filter(i => currentAnswers[i.id] === false).map(i => `- ${i.text}`).join('\n')}
        
        Si us plau, dóna una recomanació pedagògica breu (màxim 200 paraules) en català, indicant si el docent hauria d'utilitzar el recurs o no, i quins aspectes hauria de millorar prioritàriament.`,
      });
      const response = await model;
      setAiAnalysis(response.text);
    } catch (error) {
      console.error("Error generating report:", error);
      setAiAnalysis("S'ha produït un error en generar l'anàlisi. Si us plau, torna-ho a provar.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-[#1A1A1A]/10 sticky top-0 z-50 no-print">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#5A5A40] p-2 rounded-lg text-white">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Autoavaluació Docent IA</h1>
              <p className="text-xs text-[#5A5A40] font-medium uppercase tracking-wider">Marcs Educatius i Orientacions</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-[#F5F5F0] px-3 py-1.5 rounded-full border border-[#1A1A1A]/5">
            <span className="text-xs font-semibold">ESTAT:</span>
            {stats.canProceed ? (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 size={14} /> APTE
              </span>
            ) : stats.criticalFails > 0 ? (
              <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
                <AlertTriangle size={14} /> REVISIÓ NECESSÀRIA
              </span>
            ) : (
              <span className="text-xs text-amber-600 font-bold">PENDENT</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Print Only Header */}
        <div className="print-only mb-12 border-b-2 border-[#1A1A1A] pb-6">
          <h1 className="text-4xl font-serif italic mb-2">Informe d'Autoavaluació Docent IA</h1>
          <p className="text-sm uppercase tracking-widest font-bold text-[#5A5A40]">
            Escenari: {scenario === 'teacher' ? 'Gestió Docent' : 'Activitat Alumnat'} · {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Scenario Selector */}
        <div className="flex flex-col md:flex-row gap-8 mb-12 no-print">
          <div className="flex-1">
            <h2 className="text-3xl font-serif italic mb-4">Escull l'escenari d'ús</h2>
            <p className="text-[#1A1A1A]/60 max-w-lg">
              L'avaluació canvia segons si fas servir la IA per a les teves tasques de gestió o si és per a una activitat directa amb els teus alumnes.
            </p>
          </div>
          <div className="flex bg-white p-1 rounded-2xl border border-[#1A1A1A]/10 shadow-sm self-start">
            <button 
              onClick={() => setScenario('teacher')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${scenario === 'teacher' ? 'bg-[#5A5A40] text-white shadow-md' : 'hover:bg-[#F5F5F0]'}`}
            >
              <ClipboardCheck size={18} />
              <span className="font-medium">Gestió Docent</span>
            </button>
            <button 
              onClick={() => setScenario('student')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${scenario === 'student' ? 'bg-[#5A5A40] text-white shadow-md' : 'hover:bg-[#F5F5F0]'}`}
            >
              <GraduationCap size={18} />
              <span className="font-medium">Activitat Alumnat</span>
            </button>
          </div>
        </div>

        {/* Assessment Table */}
        <div className="bg-white rounded-3xl border border-[#1A1A1A]/10 shadow-xl overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F5F0]/50 border-b border-[#1A1A1A]/10">
                  <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/40">Ítem d'avaluació</th>
                  <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/40 w-24">Pes</th>
                  <th className="px-8 py-5 text-center text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/40 w-48 no-print">Validació</th>
                  <th className="px-8 py-5 text-center text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/40 w-24 print-only">Resposta</th>
                </tr>
              </thead>
              <tbody>
                {DIMENSIONS.map((dim, dimIdx) => (
                  <React.Fragment key={dim}>
                    <tr className="bg-[#5A5A40]/5">
                      <td colSpan={3} className="px-8 py-3 text-sm font-bold text-[#5A5A40] border-y border-[#5A5A40]/10">
                        {dim}
                      </td>
                    </tr>
                    {ITEMS.filter(item => item.dimension === dim).map((item) => (
                      <tr key={item.id} className="group hover:bg-[#F5F5F0]/30 transition-colors border-b border-[#1A1A1A]/5">
                        <td className="px-8 py-5">
                          <div className="flex items-start gap-3">
                            <span className="text-[#1A1A1A]/80 leading-relaxed">{item.text}</span>
                            {item.isCritical && (
                              <span className="shrink-0 mt-1 bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                Punt crític
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className="text-sm font-mono text-[#1A1A1A]/40">{item.weight}</span>
                        </td>
                        <td className="px-8 py-5 no-print">
                          <div className="flex items-center justify-center gap-4">
                            <button 
                              onClick={() => handleToggle(item.id, true)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${currentAnswers[item.id] === true ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'border-transparent text-[#1A1A1A]/30 hover:text-emerald-600'}`}
                            >
                              <CheckCircle2 size={16} />
                              <span className="text-xs font-bold">SÍ</span>
                            </button>
                            <button 
                              onClick={() => handleToggle(item.id, false)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${currentAnswers[item.id] === false ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm' : 'border-transparent text-[#1A1A1A]/30 hover:text-rose-600'}`}
                            >
                              <XCircle size={16} />
                              <span className="text-xs font-bold">NO</span>
                            </button>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center print-only">
                          <span className={`text-xs font-bold ${currentAnswers[item.id] === true ? 'text-emerald-600' : currentAnswers[item.id] === false ? 'text-rose-600' : 'text-gray-300'}`}>
                            {currentAnswers[item.id] === true ? 'SÍ' : currentAnswers[item.id] === false ? 'NO' : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Score Card */}
          <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-[#1A1A1A]/10 shadow-lg flex flex-col items-center justify-center text-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/40 mb-6">Puntuació Global</h3>
            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
              <svg className="w-full h-full -rotate-90">
                <circle 
                  cx="80" cy="80" r="70" 
                  fill="none" stroke="#F5F5F0" strokeWidth="12" 
                />
                <circle 
                  cx="80" cy="80" r="70" 
                  fill="none" stroke={stats.canProceed ? "#10B981" : stats.criticalFails > 0 ? "#EF4444" : "#F59E0B"} 
                  strokeWidth="12" 
                  strokeDasharray="440" 
                  strokeDashoffset={440 - (440 * stats.score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{Math.round(stats.score)}%</span>
                <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-tighter">Assolit</span>
              </div>
            </div>
            <div className="space-y-2 w-full">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#1A1A1A]/60">Ítems respostos:</span>
                <span>{stats.answeredCount} / {ITEMS.length}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#1A1A1A]/60">Punts crítics fallats:</span>
                <span className={stats.criticalFails > 0 ? "text-rose-600 font-bold" : "text-emerald-600"}>{stats.criticalFails}</span>
              </div>
            </div>
          </div>

          {/* Verdict & AI Analysis */}
          <div className="lg:col-span-2 space-y-8">
            <div className={`p-8 rounded-3xl border transition-all ${stats.canProceed ? 'bg-emerald-50 border-emerald-200' : stats.criticalFails > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-[#1A1A1A]/10'}`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${stats.canProceed ? 'bg-emerald-600 text-white' : stats.criticalFails > 0 ? 'bg-rose-600 text-white' : 'bg-[#F5F5F0] text-[#1A1A1A]/40'}`}>
                  {stats.canProceed ? <CheckCircle2 size={32} /> : stats.criticalFails > 0 ? <AlertTriangle size={32} /> : <Sparkles size={32} />}
                </div>
                <div>
                  <h3 className="text-2xl font-serif italic mb-2">
                    {stats.canProceed ? 'Recurs Apte per a l\'ús' : stats.criticalFails > 0 ? 'Revisió Crítica Obligatòria' : 'Completa l\'autoavaluació'}
                  </h3>
                  <p className="text-sm leading-relaxed opacity-80">
                    {stats.canProceed 
                      ? "Has validat tots els punts crítics i tens un coneixement sòlid. Pots utilitzar el recurs amb seguretat, mantenint sempre la supervisió humana."
                      : stats.criticalFails > 0 
                      ? "No hauries d'utilitzar aquest recurs en el seu estat actual. Hi ha punts crítics (Ètica, Dades o Pedagògics) que no s'estan complint."
                      : "Respon totes les preguntes per obtenir el teu perfil de risc i idoneïtat pedagògica."}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Analysis Button & Result */}
            <div className="bg-white p-8 rounded-3xl border border-[#1A1A1A]/10 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-[#5A5A40]" />
                  <h4 className="font-bold text-sm uppercase tracking-widest">Anàlisi del Perfil amb IA</h4>
                </div>
                <div className="flex gap-2 no-print">
                  {aiAnalysis && (
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-4 py-2 border border-[#5A5A40] text-[#5A5A40] rounded-xl text-xs font-bold hover:bg-[#F5F5F0] transition-all shadow-sm"
                    >
                      <FileText size={14} />
                      Imprimir PDF
                    </button>
                  )}
                  <button 
                    onClick={generateAIReport}
                    disabled={isAnalyzing || stats.answeredCount === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-xl text-xs font-bold hover:bg-[#4A4A30] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    {isAnalyzing ? <RefreshCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {aiAnalysis ? 'Actualitzar Anàlisi' : 'Generar Informe'}
                  </button>
                </div>
              </div>

              <div className="min-h-[100px] flex items-center justify-center border-2 border-dashed border-[#F5F5F0] rounded-2xl p-6">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center gap-3 text-[#1A1A1A]/40">
                    <RefreshCcw size={32} className="animate-spin" />
                    <p className="text-xs font-medium italic">L'IA està analitzant la teva reflexió pedagògica...</p>
                  </div>
                ) : aiAnalysis ? (
                  <div className="prose prose-sm max-w-none text-[#1A1A1A]/80 leading-relaxed italic">
                    {aiAnalysis}
                  </div>
                ) : (
                  <p className="text-xs text-[#1A1A1A]/40 text-center italic">
                    Un cop omplis el formulari, prem el botó per rebre una reflexió personalitzada basada en els teus resultats.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-[#1A1A1A]/5 mt-12 no-print">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-40">
            <BrainCircuit size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Guia d'ús de la IA en Educació</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-center">
            Aquesta eina és orientativa. La responsabilitat final recau sempre en el docent.
          </p>
        </div>
      </footer>
    </div>
  );
}

import React from 'react';
