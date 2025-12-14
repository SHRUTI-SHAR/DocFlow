import React, { useEffect, useState } from 'react';
import { CollaboratorPresence } from '@/types/collaboration';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveCursorsProps {
  collaborators: CollaboratorPresence[];
  containerRef?: React.RefObject<HTMLElement>;
  showLabels?: boolean;
}

const LiveCursors: React.FC<LiveCursorsProps> = ({
  collaborators,
  containerRef,
  showLabels = true,
}) => {
  const { user } = useAuth();
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (containerRef?.current) {
      const updateBounds = () => {
        setContainerBounds(containerRef.current?.getBoundingClientRect() || null);
      };
      updateBounds();
      window.addEventListener('resize', updateBounds);
      return () => window.removeEventListener('resize', updateBounds);
    }
  }, [containerRef]);

  // Filter out current user and collaborators without cursor positions
  const cursorCollaborators = collaborators.filter(
    c => c.user_id !== user?.id && c.cursor_x != null && c.cursor_y != null
  );

  const getInitials = (collaborator: CollaboratorPresence) => {
    if (collaborator.user_name) {
      return collaborator.user_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return collaborator.user_email?.charAt(0).toUpperCase() || '?';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'typing':
        return (
          <span className="ml-1 flex gap-0.5">
            <span className="animate-bounce delay-0 w-1 h-1 bg-current rounded-full" />
            <span className="animate-bounce delay-75 w-1 h-1 bg-current rounded-full" />
            <span className="animate-bounce delay-150 w-1 h-1 bg-current rounded-full" />
          </span>
        );
      case 'commenting':
        return <span className="ml-1">💬</span>;
      default:
        return null;
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <AnimatePresence>
        {cursorCollaborators.map((collaborator) => (
          <motion.div
            key={collaborator.user_id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: collaborator.cursor_x,
              y: collaborator.cursor_y,
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ 
              type: 'spring', 
              stiffness: 500, 
              damping: 30,
              mass: 0.5,
            }}
            className="absolute"
            style={{ transform: 'translate(-2px, -2px)' }}
          >
            {/* Cursor SVG */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
            >
              <path
                d="M5.5 3.21V20.79C5.5 21.52 6.37 21.93 6.94 21.47L11.24 17.85L14.28 23.34C14.4 23.54 14.59 23.67 14.81 23.73C15.03 23.79 15.26 23.76 15.45 23.64L18.19 21.92C18.56 21.69 18.69 21.19 18.47 20.81L15.43 15.32L21.21 14.89C21.96 14.84 22.35 13.98 21.88 13.41L6.93 3.52C6.36 3.06 5.5 3.47 5.5 4.21V3.21Z"
                fill={collaborator.color}
                stroke="white"
                strokeWidth="2"
              />
            </svg>

            {/* Name tag with status */}
            {showLabels && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-5 -mt-1 flex items-center"
              >
                <div
                  className="px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap shadow-lg flex items-center"
                  style={{ backgroundColor: collaborator.color }}
                >
                  <span className="max-w-[120px] truncate">
                    {collaborator.user_name || getInitials(collaborator)}
                  </span>
                  {getStatusIcon(collaborator.status)}
                </div>
              </motion.div>
            )}

            {/* Ripple effect when clicking/typing */}
            {(collaborator.status === 'editing' || collaborator.status === 'typing') && (
              <motion.div
                className="absolute top-0 left-0 w-4 h-4 rounded-full"
                style={{ backgroundColor: collaborator.color }}
                animate={{ 
                  scale: [1, 2, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LiveCursors;
