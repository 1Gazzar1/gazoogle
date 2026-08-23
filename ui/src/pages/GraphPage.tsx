import { useEffect, useRef, useState, useMemo } from "react";
import styles from "./GraphPage.module.css";
import ForceGraph2D from "react-force-graph-2d";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

interface Props {
  pageId: number;
  onBack: () => void;
}

interface LinkRow {
  fromPageId: number;
  toPageId: number;
  url: string;
  title: string | null;
}

interface LinksData {
  backlinks: LinkRow[];
  forwardlinks: LinkRow[];
}

export default function GraphPage({ pageId, onBack }: Props) {
  const [data, setData] = useState<LinksData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const graphContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    setError("");
    setData(null);

    fetch(`${API_BASE}/links/${pageId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load links");
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [pageId]);

  useEffect(() => {
    if (graphContainerRef.current) {
      const observer = new ResizeObserver(entries => {
        if (entries[0]) {
          setDimensions({
            width: entries[0].contentRect.width,
            height: entries[0].contentRect.height
          });
        }
      });
      observer.observe(graphContainerRef.current);
      return () => observer.disconnect();
    }
  }, [data]);

  const graphData = useMemo(() => {
    if (!data || pageId === null) return { nodes: [], links: [] };
    
    const nodes = new Map<number, any>();
    const links: any[] = [];
    
    nodes.set(pageId, {
      id: pageId,
      name: "Current Page",
      val: 8,
      color: "#fb923c"
    });
    
    data.backlinks.forEach(link => {
      if (!nodes.has(link.fromPageId)) {
        nodes.set(link.fromPageId, {
          id: link.fromPageId,
          name: link.title || link.url,
          val: 3,
          color: "#94a3b8"
        });
      }
      links.push({ source: link.fromPageId, target: link.toPageId });
    });
    
    data.forwardlinks.forEach(link => {
      if (!nodes.has(link.toPageId)) {
        nodes.set(link.toPageId, {
          id: link.toPageId,
          name: link.title || link.url,
          val: 3,
          color: "#94a3b8"
        });
      }
      links.push({ source: link.fromPageId, target: link.toPageId });
    });
    
    return { nodes: Array.from(nodes.values()), links };
  }, [data, pageId]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          &larr; Back to Results
        </button>
        <h2>Page Graph</h2>
      </header>

      <main className={styles.content}>
        {loading && <div className={styles.msg}>Loading graph data...</div>}
        {error && <div className={styles.msg}>Error: {error}</div>}
        
        {!loading && !error && data && (
          <div ref={graphContainerRef} style={{ flex: 1, position: "relative" }}>
            {dimensions.width > 0 && dimensions.height > 0 && (
              <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel="name"
                nodeColor="color"
                nodeRelSize={4}
                linkColor={() => "rgba(255, 255, 255, 0.2)"}
                backgroundColor="transparent"
                dagMode="lr"
                dagLevelDistance={150}
                linkDirectionalArrowLength={3.5}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
