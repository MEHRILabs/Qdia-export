import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Undo, Redo, ZoomIn, ZoomOut, Eraser, Sparkles, Crop, ImageIcon, Download, ShieldCheck } from "lucide-react";

export default function Studio() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card h-14 flex items-center px-6 shrink-0 z-10">
        <Link href="/" className="font-bold text-lg flex items-center gap-2 text-primary">
          <img src="/public/logo.png" alt="QDIA Export" className="h-6 w-6 object-contain" />
          AI Editing Studio
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Button variant="outline" size="sm">Discard</Button>
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Save to Catalog
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Tools Panel */}
        <aside className="w-64 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Image Tools</h3>
          </div>
          <div className="p-2 space-y-1 overflow-y-auto flex-1">
            <button className="w-full flex items-center gap-3 px-3 py-3 text-sm rounded-md hover:bg-muted transition-colors text-left">
              <div className="bg-primary/10 text-primary p-1.5 rounded">
                <Eraser className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium">Remove Background</div>
                <div className="text-[10px] text-muted-foreground">Auto-detect subject</div>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-3 text-sm rounded-md hover:bg-muted transition-colors text-left bg-muted/50 border border-border/50">
              <div className="bg-secondary/20 text-secondary-foreground p-1.5 rounded">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium">AI Studio Scene</div>
                <div className="text-[10px] text-muted-foreground">Generate commercial bg</div>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-3 text-sm rounded-md hover:bg-muted transition-colors text-left">
              <div className="bg-muted-foreground/10 text-muted-foreground p-1.5 rounded">
                <Crop className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium">Crop 1:1</div>
                <div className="text-[10px] text-muted-foreground">Standard catalog size</div>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-3 text-sm rounded-md hover:bg-muted transition-colors text-left">
              <div className="bg-muted-foreground/10 text-muted-foreground p-1.5 rounded">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium">Add Watermark</div>
                <div className="text-[10px] text-muted-foreground">Apply QDIA verified logo</div>
              </div>
            </button>
          </div>
          
          <div className="p-4 border-t bg-muted/30">
            <div className="bg-card border rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-xs">AI Assistant</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3 leading-tight">
                Generating natural lighting and white pedestal for product presentation...
              </p>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[65%] rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 bg-[#e5e5e5] relative flex flex-col">
          {/* Canvas Checkerboard */}
          <div 
            className="absolute inset-0 z-0 opacity-50"
            style={{
              backgroundImage: `linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)`,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
          />
          
          {/* Top Controls */}
          <div className="relative z-10 p-4 flex justify-center">
            <div className="bg-card border shadow-sm rounded-md flex items-center p-1 gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Undo className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Redo className="h-4 w-4" /></Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><ZoomOut className="h-4 w-4" /></Button>
              <span className="text-xs font-medium w-12 text-center">100%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><ZoomIn className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Image Canvas */}
          <div className="relative z-10 flex-1 flex items-center justify-center p-8">
            <div className="relative shadow-2xl bg-white rounded-sm ring-1 ring-black/5 max-w-2xl w-full aspect-square flex items-center justify-center overflow-hidden group">
              <img src="/public/olive-oil.png" alt="Product Draft" className="w-[80%] h-[80%] object-contain" />
              
              {/* Badge Overlay */}
              <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur text-white text-[10px] font-semibold px-2 py-1 rounded-sm border border-white/10 flex items-center gap-1.5 opacity-90">
                <ShieldCheck className="h-3 w-3" />
                QDIA VERIFIED ASSET
              </div>

              {/* Edit bounds mock */}
              <div className="absolute inset-[10%] border border-primary/40 border-dashed rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
