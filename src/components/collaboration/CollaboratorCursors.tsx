import React from 'react';
import { CollaboratorPresence } from '@/types/collaboration';
import { useAuth } from '@/hooks/useAuth';

interface CollaboratorCursorsProps {
  collaborators: CollaboratorPresence[];
  containerRef?: React.RefObject<HTMLElement>;
}

const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({
  collaborators,
  containerRef,
}) => {
  const { user } = useAuth();

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

  return (
    <>
      {cursorCollaborators.map((collaborator) => (
        <div
          key={collaborator.user_id}
          className="pointer-events-none absolute z-50 transition-all duration-75"
          style={{
            left: collaborator.cursor_x,
            top: collaborator.cursor_y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor SVG */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
          >
            <path
              d="M5.5 3.21V20.79C5.5 21.52 6.37 21.93 6.94 21.47L11.24 17.85L14.28 23.34C14.4 23.54 14.59 23.67 14.81 23.73C15.03 23.79 15.26 23.76 15.45 23.64L18.19 21.92C18.56 21.69 18.69 21.19 18.47 20.81L15.43 15.32L21.21 14.89C21.96 14.84 22.35 13.98 21.88 13.41L6.93 3.52C6.36 3.06 5.5 3.47 5.5 4.21V3.21Z"
              fill={collaborator.color}
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>

          {/* Name tag */}
          <div
            className="ml-4 -mt-1 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
            style={{ backgroundColor: collaborator.color }}
          >
            {collaborator.user_name || getInitials(collaborator)}
          </div>
        </div>
      ))}
    </>
  );
};

export default CollaboratorCursors;
