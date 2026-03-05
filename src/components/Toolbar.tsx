import { useState } from 'react';
import {
  HomeOutlined,
  PictureOutlined,
  HistoryOutlined,
  FileTextOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useTheme } from '../theme';

interface ToolbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface ToolbarItem {
  key: string;
  icon: React.ReactNode;
  label: string;
}

const toolbarItems: ToolbarItem[] = [
  { key: 'workspace', icon: <HomeOutlined />, label: '工作台' },
  { key: 'gallery', icon: <PictureOutlined />, label: '参考图库' },
  { key: 'history', icon: <HistoryOutlined />, label: '历史记录' },
  { key: 'templates', icon: <FileTextOutlined />, label: '模板' },
  { key: 'accounts', icon: <RobotOutlined />, label: '账号' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ currentPage, onNavigate }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 8px',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderRight: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      }}
    >
      {toolbarItems.map(item => {
        const isActive = currentPage === item.key;
        const isHovered = hoveredKey === item.key;

        return (
          <div
            key={item.key}
            onClick={() => onNavigate(item.key)}
            onMouseEnter={() => setHoveredKey(item.key)}
            onMouseLeave={() => setHoveredKey(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 8px',
              marginBottom: '4px',
              cursor: 'pointer',
              borderRadius: '12px',
              backgroundColor: isActive
                ? isDark
                  ? 'rgba(129, 140, 248, 0.15)'
                  : 'rgba(99, 102, 241, 0.1)'
                : isHovered
                  ? isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.04)'
                  : 'transparent',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isActive
                  ? isDark
                    ? '#818cf8'
                    : '#6366f1'
                  : isHovered
                    ? isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.05)'
                    : 'transparent',
                color: isActive ? '#ffffff' : isDark ? '#94a3b8' : '#64748b',
                transition: 'all 0.2s ease',
                fontSize: 16,
              }}
            >
              {item.icon}
            </div>
            {isHovered && (
              <div
                style={{
                  position: 'absolute',
                  left: '100%',
                  marginLeft: '8px',
                  padding: '6px 12px',
                  backgroundColor: isDark ? '#334155' : '#1e293b',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                }}
              >
                {item.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
