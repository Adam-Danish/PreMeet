"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Compass,
  Menu,
  Network,
  X,
} from "lucide-react";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const isEvents = pathname.startsWith("/events");

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="mobile-header">
        <Link href="/" className="brand" onClick={() => setMenuOpen(false)}>
          <Network aria-hidden="true" className="brand-symbol" />
          PreMeet
        </Link>
        <button
          ref={menuButton}
          type="button"
          className="icon-button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="workspace-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </header>
      <aside className={`workspace-sidebar${menuOpen ? " is-open" : ""}`}>
        <Link href="/" className="brand desktop-brand">
          <Network className="brand-symbol" aria-hidden="true" />
          PreMeet<span className="brand-period">.</span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-monogram">PM</span>
          <div>
            Founder workspace<small>Make every connection count</small>
          </div>
        </div>
        <nav
          id="workspace-navigation"
          aria-label="Main navigation"
          onClick={() => setMenuOpen(false)}
        >
          <p className="nav-group-label">Workspace</p>
          <Link
            className={`sidebar-link${!isEvents ? " selected" : ""}`}
            href="/"
            aria-current={!isEvents ? "page" : undefined}
          >
            <Compass aria-hidden="true" />
            Game plan
            <ChevronRight className="nav-chevron" aria-hidden="true" />
          </Link>
          <Link
            className={`sidebar-link${isEvents ? " selected" : ""}`}
            href="/events"
            aria-current={isEvents ? "page" : undefined}
          >
            <CalendarDays aria-hidden="true" />
            Explore events
            <ChevronRight className="nav-chevron" aria-hidden="true" />
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <p>
              A little preparation.
              <br />A better conversation.
            </p>
            <Link href="/events" onClick={() => setMenuOpen(false)}>
              Find your next event
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="workspace-signoff">
            <span className="status-dot" />
            Built for meaningful connections
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <div className="workspace-breadcrumb">
          <span>Workspace</span>
          <ChevronRight size={14} aria-hidden="true" />
          <span>{isEvents ? "Explore events" : "Game plan"}</span>
          <span className="workspace-region">Connecting across ASEAN</span>
        </div>
        {children}
        <footer className="site-footer">
          <span>
            PreMeet<span className="brand-period">.</span>
          </span>
          <span>Good connections start before hello.</span>
        </footer>
      </div>
    </div>
  );
}
