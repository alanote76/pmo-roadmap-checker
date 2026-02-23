'use client';
import { useState, useCallback, useRef } from 'react';

interface CriteriaResult { name: string; score: number; maxScore: number; status: 'pass'|'warning'|'fail'; details: string; recommendations: string[]; }
interface AnalysisResult { globalScore: number; maxScore: number; percentage: number; grade: string; summary: string; criteria: CriteriaResult[]; generalRecommendations: string[]; }
interface SlideImage { data: string; mediaType: string; }

export default function Home() {
  const [file, setFile] = useState<File|null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<AnalysisResult|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    const ext = f.name.toLowerCase().split('.').pop();
    if (!['pptx','ppt','pdf'].includes(ext||'')) { setError('Format non supporté. Uploadez un PPT, PPTX ou PDF.'); return; }
    if (f.size > 20*1024*1024) { setError('Fichier trop volumineux (max 20 Mo).'); return; }
    setFile(f); setError(null); setResult(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }, [handleFile]);

  const loadPdfJs = async () => {
    if ((window as any).pdfjsLib) return;
    await new Promise<void>((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => { (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; res(); };
      s.onerror = () => rej(new Error('Impossible de charger pdf.js'));
      document.head.appendChild(s);
    });
  };

  const pdfToImages = async (buf: ArrayBuffer): Promise<SlideImage[]> => {
    await loadPdfJs();
    const pdf = await (window as any).pdfjsLib.getDocument({ data: buf }).promise;
    const imgs: SlideImage[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
      imgs.push({ data: canvas.toDataURL('image/png').split(',')[1], mediaType: 'image/png' });
    }
    return imgs;
  };

  const toB64 = (f: File): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej; r.readAsDataURL(f);
  });

  const analyze = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'pdf') {
        setLoadingStep('Conversion des slides en images...');
        const imgs = await pdfToImages(await file.arrayBuffer());
        if (!imgs.length) throw new Error('Aucune slide détectée.');
        setLoadingStep(`${imgs.length} slide(s). Envoi à Claude Vision...`);
        const r = await fetch('/api/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ images: imgs, fileName: file.name }) });
        setLoadingStep('Analyse en cours par Claude...');
        if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error || `Erreur (${r.status})`);
        setResult(await r.json());
      } else {
        setLoadingStep('Préparation du fichier PowerPoint...');
        const b64 = await toB64(file);
        setLoadingStep('Envoi à Claude pour analyse...');
        const r = await fetch('/api/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ images: [{ data: b64, mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }], fileName: file.name, isPptx: true }) });
        setLoadingStep('Analyse en cours par Claude...');
        if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error || `Erreur (${r.status})`);
        setResult(await r.json());
      }
    } catch (e: any) { setError(e.message || 'Erreur inconnue'); }
    finally { setLoading(false); setLoadingStep(''); }
  };

  const reset = () => { setFile(null); setResult(null); setError(null); if(ref.current) ref.current.value=''; };
  const gc = (p: number) => p>=80?'text-success':p>=60?'text-accent':p>=40?'text-warning':'text-danger';
  const gb = (p: number) => p>=80?'bg-success':p>=60?'bg-accent':p>=40?'bg-warning':'bg-danger';
  const si = (s: string) => s==='pass'?'✓':s==='warning'?'⚠':'✗';
  const sc = (s: string) => s==='pass'?'text-success border-success/30 bg-success/5':s==='warning'?'text-warning border-warning/30 bg-warning/5':'text-danger border-danger/30 bg-danger/5';
  const gl = (p: number) => p>=80?'Conforme':p>=60?'Acceptable':p>=40?'À améliorer':'Non conforme';

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 lg:px-16 max-w-6xl mx-auto">
      <header className="mb-12 fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">PMO Roadmap <span className="text-accent">Checker</span></h1>
        </div>
        <p className="text-muted text-sm md:text-base ml-[52px]">Vérifiez la conformité de vos feuilles de route au gabarit PMO</p>
      </header>

      {!result && (
        <section className="fade-in-up fade-in-up-delay-1">
          <div className={`upload-zone rounded-2xl p-8 md:p-12 text-center transition-all ${dragging?'dragging':''} ${file?'border-accent/50':''}`}
            onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop} onClick={()=>!file&&ref.current?.click()}>
            <input ref={ref} type="file" accept=".pptx,.ppt,.pdf" className="hidden" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
            {!file ? (<>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate/80 border border-white/5 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <p className="text-lg font-medium mb-1">Déposez votre feuille de route ici</p>
              <p className="text-muted text-sm">ou cliquez pour parcourir — PPT, PPTX ou PDF (max 20 Mo)</p>
              <p className="text-muted/60 text-xs mt-3">💡 Pour une meilleure analyse visuelle, exportez votre PPT en PDF</p>
            </>) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 bg-navy/50 rounded-xl px-5 py-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="font-medium truncate max-w-[300px]">{file.name}</span>
                  <span className="text-muted text-xs">({(file.size/1024/1024).toFixed(1)} Mo)</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={e=>{e.stopPropagation();analyze()}} disabled={loading} className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-navy font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2">
                    {loading?(<><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Analyse...</>)
                    :(<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 14l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>Analyser</>)}
                  </button>
                  <button onClick={e=>{e.stopPropagation();reset()}} className="px-4 py-2.5 bg-slate/50 hover:bg-slate text-muted hover:text-white rounded-xl transition-all border border-white/5">Changer</button>
                </div>
              </div>
            )}
          </div>
          {loading&&<div className="mt-6 text-center"><div className="inline-flex items-center gap-3 bg-slate/50 rounded-xl px-5 py-3 pulse-glow"><div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-accent animate-bounce"/><div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{animationDelay:'150ms'}}/><div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{animationDelay:'300ms'}}/></div><span className="text-sm text-muted">{loadingStep}</span></div></div>}
          {error&&<div className="mt-6 bg-danger/10 border border-danger/20 rounded-xl px-5 py-4 flex items-start gap-3"><span className="text-danger text-lg">✗</span><div><p className="text-danger font-medium text-sm">Erreur d&apos;analyse</p><p className="text-danger/80 text-sm mt-1">{error}</p></div></div>}
        </section>
      )}

      {result && (
        <section>
          <div className="gradient-border p-6 md:p-8 mb-6 fade-in-up">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative shrink-0">
                <svg className="score-ring w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                  <circle cx="60" cy="60" r="52" fill="none" stroke={result.percentage>=80?'#06D6A0':result.percentage>=60?'#00B4D8':result.percentage>=40?'#FFD166':'#EF476F'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(result.percentage/100)*327} 327`} className="transition-all duration-1000"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold font-mono ${gc(result.percentage)}`}>{result.percentage}%</span>
                  <span className="text-xs text-muted mt-1">{result.globalScore}/{result.maxScore} pts</span>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
                  <span className={`text-2xl font-bold ${gc(result.percentage)}`}>{result.grade}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${gb(result.percentage)} text-navy`}>{gl(result.percentage)}</span>
                </div>
                <p className="text-muted text-sm leading-relaxed">{result.summary}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 mb-6">
            <h2 className="text-lg font-semibold font-display flex items-center gap-2 fade-in-up fade-in-up-delay-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              Détail par critère
            </h2>
            {result.criteria.map((c,i)=>(
              <div key={i} className="gradient-border p-4 md:p-5 fade-in-up" style={{animationDelay:`${(i+2)*100}ms`,opacity:0}}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center text-sm font-bold ${sc(c.status)}`}>{si(c.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="font-medium text-sm">{c.name}</h3>
                      <span className="font-mono text-xs text-muted shrink-0">{c.score}/{c.maxScore}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full mb-2 overflow-hidden">
                      <div className={`h-full rounded-full animate-fill ${c.status==='pass'?'bg-success':c.status==='warning'?'bg-warning':'bg-danger'}`} style={{'--fill':`${(c.score/c.maxScore)*100}%`} as React.CSSProperties}/>
                    </div>
                    <p className="text-muted text-xs leading-relaxed mb-2">{c.details}</p>
                    {c.recommendations.length>0&&(
                      <div className="bg-navy/50 rounded-lg p-3 mt-2">
                        <p className="text-[10px] uppercase tracking-wider text-accent/70 font-semibold mb-1.5">Recommandations</p>
                        {c.recommendations.map((r,j)=><p key={j} className="text-xs text-muted/90 leading-relaxed flex gap-2"><span className="text-accent shrink-0">→</span>{r}</p>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {result.generalRecommendations.length>0&&(
            <div className="gradient-border p-5 md:p-6 mb-6 fade-in-up fade-in-up-delay-4">
              <h2 className="text-lg font-semibold font-display flex items-center gap-2 mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Recommandations générales
              </h2>
              <div className="space-y-2">{result.generalRecommendations.map((r,i)=><div key={i} className="flex gap-3 items-start"><span className="text-warning text-xs mt-0.5 shrink-0">●</span><p className="text-sm text-muted/90 leading-relaxed">{r}</p></div>)}</div>
            </div>
          )}

          <div className="flex gap-3 justify-center fade-in-up fade-in-up-delay-4">
            <button onClick={reset} className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-navy font-semibold rounded-xl transition-all flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Analyser un autre fichier
            </button>
          </div>
        </section>
      )}

      <footer className="mt-16 text-center text-xs text-muted/50 pb-4">PMO Roadmap Checker — Propulsé par Claude Vision AI</footer>
    </main>
  );
}
