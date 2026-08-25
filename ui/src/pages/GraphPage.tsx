import { useEffect, useRef, useState, useMemo } from "react";
import styles from "./GraphPage.module.css";
import ForceGraph2D from "react-force-graph-2d";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

interface Props {
  pageId: number;
  pageTitle?: string;
  pageUrl?: string;
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

export default function GraphPage({ pageId, pageTitle, pageUrl, onBack }: Props) {
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
      name: pageTitle || "Current Page",
      url: pageUrl || "Current Page",
      val: 8,
      color: "#fb923c",
      fx: 0,
      fy: 0
    });
    
    const spanRad = 170 * (Math.PI / 180);

    const numBack = data.backlinks.length;
    data.backlinks.forEach((link, i) => {
      let angle = Math.PI;
      if (numBack > 1) {
        angle = Math.PI - (spanRad / 2) + (spanRad * i) / (numBack - 1);
      }
      const radius = 150 + (i % 5) * 40;

      if (!nodes.has(link.fromPageId)) {
        nodes.set(link.fromPageId, {
          id: link.fromPageId,
          name: link.title || "Not Indexed",
          url: link.url,
          val: 3,
          color: "#94a3b8",
          fx: Math.cos(angle) * radius,
          fy: Math.sin(angle) * radius
        });
      }
      links.push({ source: link.fromPageId, target: link.toPageId });
    });
    
    const numFwd = data.forwardlinks.length;
    data.forwardlinks.forEach((link, i) => {
      let angle = 0;
      if (numFwd > 1) {
        angle = 0 - (spanRad / 2) + (spanRad * i) / (numFwd - 1);
      }
      const radius = 150 + (i % 5) * 40;

      if (!nodes.has(link.toPageId)) {
        nodes.set(link.toPageId, {
          id: link.toPageId,
          name: link.title || "Not Indexed",
          url: link.url,
          val: 3,
          color: "#94a3b8",
          fx: Math.cos(angle) * radius,
          fy: Math.sin(angle) * radius
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
        <h2>Page Graph: {pageTitle}</h2>
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
                nodeLabel={(node: any) => `
                  <div style="background: rgba(0,0,0,0.8); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; max-width: 300px; text-align: center;">
                    <strong>${node.name}</strong><br/>
                    <span style="color: #94a3b8">${node.url}</span>
                  </div>
                `}
                nodeColor="color"
                nodeRelSize={4}
                onNodeClick={(node: any) => {
                  if (node.url && node.url !== "Current Page") {
                    window.open(node.url, "_blank");
                  }
                }}
                nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
                  const label = node.name;
                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                  ctx.fillStyle = node.color;
                  ctx.fill();

                  // Only draw text if we're zoomed in enough to make it readable
                  if (globalScale >= 1.5) {
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillText(label, node.x, node.y + node.val + (fontSize));
                  }
                }}
                linkColor={() => "rgba(255, 255, 255, 0.2)"}
                backgroundColor="transparent"
                linkDirectionalArrowLength={3.5}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
