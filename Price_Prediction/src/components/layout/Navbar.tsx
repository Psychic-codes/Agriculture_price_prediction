import React from "react";
import { theme } from "../../styles/theme";
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  searchPlaceholder?: string;
}

const SearchIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text.muted} strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const BellIcon: React.FC = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={theme.colors.neutral} strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const WheatIcon: React.FC = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={theme.colors.neutral} strokeWidth="2">
    <path d="M12 22V5" />
    <path d="M5 12c0-4.4 3.1-8 7-8s7 3.6 7 8c0 0-3.1-2-7-2s-7 2-7 2z" />
    <path d="M5 17c0-2.2 3.1-4 7-4s7 1.8 7 4c0 0-3.1-1-7-1s-7 1-7 1z" />
  </svg>
);

const Navbar: React.FC<NavbarProps> = ({
  searchPlaceholder = "Search crops, regions or trends...",
}) => {
  const { isGovernmentUser } = useAuth();
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "13px 28px",
        background: theme.colors.white,
        borderBottom: `1px solid ${theme.colors.neutralBorder}`,
        flexShrink: 0,
        fontFamily: theme.fonts.body,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Search */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          background: theme.colors.neutralLight,
          borderRadius: theme.radius.full,
          padding: "9px 16px",
          gap: 9,
          maxWidth: 420,
          border: `1px solid ${theme.colors.neutralBorder}`,
        }}
      >
        <SearchIcon />
        <input
          placeholder={searchPlaceholder}
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: 13,
            color: theme.colors.text.primary,
            width: "100%",
            fontFamily: theme.fonts.body,
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Icon actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          style={{
            width: 38,
            height: 38,
            borderRadius: theme.radius.full,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <BellIcon />
          <span
            style={{
              position: "absolute",
              top: 7,
              right: 7,
              width: 7,
              height: 7,
              background: theme.colors.secondary,
              borderRadius: "50%",
              border: `2px solid ${theme.colors.white}`,
            }}
          />
        </button>

        <button
          style={{
            width: 38,
            height: 38,
            borderRadius: theme.radius.full,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <WheatIcon />
        </button>
      </div>

      {/* CTA */}
      {isGovernmentUser && <button
        style={{
          background: theme.colors.primary,
          color: theme.colors.white,
          border: "none",
          borderRadius: theme.radius.full,
          padding: "10px 22px",
          fontWeight: 700,
          fontSize: 13.5,
          cursor: "pointer",
          fontFamily: theme.fonts.heading,
          letterSpacing: "-0.2px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.primaryDark)}
        onMouseLeave={(e) => (e.currentTarget.style.background = theme.colors.primary)}
      >
        + Add Harvest
      </button>}

      {/* Avatar */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${theme.colors.secondary}, ${theme.colors.primary})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.colors.white,
          fontWeight: 800,
          fontSize: 13,
          cursor: "pointer",
          fontFamily: theme.fonts.heading,
          flexShrink: 0,
        }}
      >
        FD
      </div>
    </header>
  );
};

export default Navbar;