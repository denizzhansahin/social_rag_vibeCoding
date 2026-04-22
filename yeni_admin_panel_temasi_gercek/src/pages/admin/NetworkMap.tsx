import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import { GET_NETWORK_GRAPH, TRIGGER_FULL_SYNC, GET_FILTERED_GRAPH } from '../../api/graphql';
import { Maximize2, ZoomIn, ZoomOut, Filter, Users, UsersRound, CalendarDays, X, Activity, RefreshCcw, ArrowLeft, Radio } from 'lucide-react';

export default function NetworkMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const graphRef = useRef<any>();

  // Filtering state
  const [showFilters, setShowFilters] = useState(false);
  const [graphType, setGraphType] = useState<'users' | 'groups' | 'events' | 'social' | 'behavioral'>('users');
  const [filterId, setFilterId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNeo4jBrowser, setShowNeo4jBrowser] = useState(true);
  
  // GraphQL Data
  const { data: networkData, loading: networkLoading, refetch: refetchNetwork } = useQuery(GET_NETWORK_GRAPH) as any;
  const [loadFiltered, { data: filteredData, loading: filteredLoading }] = useLazyQuery(GET_FILTERED_GRAPH) as any;
  const [triggerSyncMutation] = useMutation(TRIGGER_FULL_SYNC);

  const rawNodes = (filterId ? filteredData?.getFilteredGraph?.nodes : networkData?.getNetworkGraph?.nodes) || [];
  const rawLinks = (filterId ? filteredData?.getFilteredGraph?.links : networkData?.getNetworkGraph?.links) || [];

  const allTraits = Array.from(new Set(rawNodes.filter((n: any) => n.label === 'User' || n.label === 'Participant').map((n: any) => n.name)));
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);

  // Initialize traits filter once data is loaded
  useEffect(() => {
    if (allTraits.length > 0 && selectedTraits.length === 0) {
      setSelectedTraits(allTraits);
    }
  }, [allTraits]);
  
  // Selected Node State
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ width: clientWidth, height: clientHeight });
    }

    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.2, 400);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.2, 400);
    }
  };

  const handleFit = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  };

  const toggleTrait = (trait: string) => {
    setSelectedTraits(prev => 
      prev.includes(trait) ? prev.filter(t => t !== trait) : [...prev, trait]
    );
  };

  // Filter graph data
  const filteredNodes = rawNodes.filter((n: any) => {
    if (graphType === 'users' && n.type !== 'user' && n.type !== 'participant') return false;
    if (graphType === 'groups' && n.type !== 'user' && n.type !== 'group' && n.type !== 'participant') return false;
    if (graphType === 'events' && n.type !== 'user' && n.type !== 'event' && n.type !== 'participant') return false;
    if (graphType === 'social' && n.label !== 'SocialObject' && n.type !== 'user' && n.type !== 'participant') return false;
    if (graphType === 'behavioral' && n.label !== 'Page' && n.type !== 'user' && n.type !== 'participant') return false;
    
    if (n.type === 'user' || n.type === 'participant') return selectedTraits.includes(n.name);
    return true;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n: any) => n.id));
  const filteredLinks = rawLinks.filter((l: any) => 
    filteredNodeIds.has(typeof l.source === 'object' ? (l.source as any).id : l.source) && 
    filteredNodeIds.has(typeof l.target === 'object' ? (l.target as any).id : l.target)
  );

  const graphData = { nodes: filteredNodes, links: filteredLinks };

  if (networkLoading && rawNodes.length === 0) return <div className="flex items-center justify-center h-full text-white">Grafik Yükleniyor...</div>;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Neo4j Risk Radarı</h1>
          <p className="text-gray-400 text-sm">Kullanıcılar, gruplar ve etkinlikler arası gizli ilişkileri analiz edin.</p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setShowNeo4jBrowser(!showNeo4jBrowser)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dark-border bg-dark-surface text-gray-400 hover:text-neon-mint transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="text-sm font-medium">{showNeo4jBrowser ? 'Grafiğe Dön' : 'Gelişmiş Görünüm'}</span>
          </button>
          
          <button 
            onClick={async () => {
              setIsSyncing(true);
              try {
                await triggerSyncMutation();
                alert('Senkronizasyon başlatıldı. Lütfen biraz bekleyin.');
                setTimeout(() => { refetchNetwork(); setIsSyncing(false); }, 3000);
              } catch (e) {
                alert('Hata: ' + e);
                setIsSyncing(false);
              }
            }}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dark-border bg-dark-surface text-gray-400 hover:text-electric-blue transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Senkronize Et</span>
          </button>

          {filterId && (
            <button 
              onClick={() => { setFilterId(null); setSelectedNode(null); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neon-mint/30 bg-neon-mint/10 text-neon-mint hover:bg-neon-mint/20 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Filtreyi Temizle</span>
            </button>
          )}

          <div className="flex bg-dark-surface border border-dark-border rounded-lg p-1">
            <button 
              onClick={() => setGraphType('users')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${graphType === 'users' ? 'bg-electric-blue/20 text-electric-blue' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Users className="w-4 h-4" /> Kişiler
            </button>
            <button 
              onClick={() => setGraphType('groups')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${graphType === 'groups' ? 'bg-neon-mint/20 text-neon-mint' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <UsersRound className="w-4 h-4" /> Gruplar
            </button>
            <button 
              onClick={() => setGraphType('events')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${graphType === 'events' ? 'bg-coral-red/20 text-coral-red' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <CalendarDays className="w-4 h-4" /> Etkinlikler
            </button>
            <button 
              onClick={() => setGraphType('social')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${graphType === 'social' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Radio className="w-4 h-4" /> Sosyal
            </button>
            <button 
              onClick={() => setGraphType('behavioral')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${graphType === 'behavioral' ? 'bg-amber-500/20 text-amber-500' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Activity className="w-4 h-4" /> Davranış
            </button>
          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${showFilters ? 'bg-electric-blue/10 border-electric-blue text-electric-blue' : 'bg-dark-surface border-dark-border text-gray-400 hover:text-white'}`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtreler</span>
          </button>
        </div>
      </div>

      {showFilters && graphType === 'users' && (
        <div className="bg-dark-surface border border-dark-border rounded-xl p-4 flex flex-wrap gap-2">
          <div className="w-full text-xs font-mono text-gray-500 mb-1">BİLİŞSEL ETİKET FİLTRESİ</div>
          {(allTraits as string[]).map(trait => (
            <button
              key={trait}
              onClick={() => toggleTrait(trait)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                selectedTraits.includes(trait) 
                  ? 'bg-white/10 text-white border-white/20' 
                  : 'bg-transparent text-gray-500 border-dark-border hover:border-gray-600'
              }`}
            >
              {trait}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 bg-[#010409] border border-dark-border rounded-xl relative overflow-hidden" ref={containerRef}>
        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-dark-surface/80 backdrop-blur border border-dark-border p-2 rounded-lg">
          <button onClick={handleZoomIn} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleZoomOut} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleFit} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-dark-surface/80 backdrop-blur border border-dark-border p-4 rounded-lg text-xs font-mono space-y-2">
          <div className="text-gray-300 font-bold mb-2 border-b border-dark-border pb-1">DÜĞÜM TİPLERİ</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#00f2fe]"></span> Kullanıcı</div>
          {graphType === 'groups' && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#10b981]"></span> Grup</div>}
          {graphType === 'events' && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ef4444]"></span> Etkinlik</div>}
          {graphType === 'social' && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#a855f7]"></span> Paylaşım/Yorum</div>}
          {graphType === 'behavioral' && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span> Sayfa (URL)</div>}
        </div>

        {/* Selected Node Details Overlay */}
        {selectedNode && (
          <div className="absolute top-4 left-4 z-20 bg-dark-surface/90 backdrop-blur-md border border-dark-border p-5 rounded-xl shadow-2xl w-72">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-white text-lg">{selectedNode.name}</h3>
              <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {selectedNode.type === 'user' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">ETİKET:</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-electric-blue/10 text-electric-blue border border-electric-blue/20">
                    {selectedNode.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">DURUM:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-neon-mint" />
                    <span className="text-xs text-gray-300">Aktif</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-dark-border mt-2">
                  <span className="text-xs text-gray-400">Bağlantı Sayısı: {
                    filteredLinks.filter(l => 
                      (typeof l.source === 'object' ? (l.source as any).id : l.source) === selectedNode.id || 
                      (typeof l.target === 'object' ? (l.target as any).id : l.target) === selectedNode.id
                    ).length
                  }</span>
                </div>
              </div>
            )}

            {selectedNode.type === 'group' && (
              <div className="space-y-2">
                <div className="text-xs font-mono text-gray-500">GRUP DETAYI</div>
                <p className="text-sm text-gray-300">Bu grup, etkinlik boyunca ortak görevler üzerinde çalışan katılımcıları temsil eder.</p>
              </div>
            )}

            {selectedNode.type === 'event' && (
              <div className="space-y-2">
                <div className="text-xs font-mono text-gray-500">ETKİNLİK DETAYI</div>
                <p className="text-sm text-gray-300">Bu etkinliğe katılan veya konuşmacı olan kişilerin ağını gösterir.</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-dark-border">
              <button 
                onClick={() => {
                   setFilterId(selectedNode.id);
                   loadFiltered({ variables: { id: selectedNode.id } });
                }}
                className="w-full bg-electric-blue py-2 rounded-lg text-dark-bg font-bold text-sm hover:shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-all"
              >
                BU DÜĞÜME ODAKLAN
              </button>
            </div>
          </div>
        )}

        {showNeo4jBrowser ? (
          <div className="w-full h-full bg-white relative">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
              <a 
                href="http://localhost:7474/browser/" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Haritayı Yeni Sekmede Aç (CSP Hatası Alıyorsanız)
              </a>
              <div className="bg-dark-surface/90 backdrop-blur px-3 py-1.5 rounded-full border border-dark-border text-[10px] text-gray-300">
                Şifre: <span className="text-neon-mint font-mono">ai_neo4j_password</span>
              </div>
            </div>
            <iframe 
              src="http://localhost:7474/browser/" 
              className="w-full h-full border-none"
              title="Neo4j Browser"
            />
            {/* Overlay hint if blocked */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
               <span className="text-gray-400 text-sm">Tarayıcı güvenliği nedeniyle iframe engellenmiş olabilir. Üstteki butonu kullanın.</span>
            </div>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={(node: any) => {
              if (node.type === 'group') return '#10b981'; // Mint
              if (node.type === 'event') return '#ef4444'; // Red
              if (node.type === 'socialobject') return '#a855f7'; // Purple
              if (node.type === 'page') return '#f59e0b'; // Amber
              return '#00f2fe'; // User / Default Blue
            }}
            nodeRelSize={6}
            linkColor={() => 'rgba(255,255,255,1)'}
            linkWidth={1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={() => '#00f2fe'}
            backgroundColor="#010409"
            onNodeClick={(node) => {
              setSelectedNode(node);
              // Center on node
              graphRef.current?.centerAt(node.x, node.y, 1000);
              graphRef.current?.zoom(4, 1000);
            }}
          />
        )}
      </div>
    </div>
  );
}
