import React from 'react';
import { CollaboratorPresence } from '@/types/collaboration';
import { useAuth } from '@/hooks/useAuth';

interface SelectionHighlightProps {
  collaborators: CollaboratorPresence[];
  fieldId?: string;
  getTextPosition?: (position: number) => { x: number; y: number; height: number };
}

const SelectionHighlight: React.FC<SelectionHighlightProps> = ({
  collaborators,
  fieldId,
  getTextPosition,
}) => {
  const { user } = useAuth();

  // Filter collaborators with selections, excluding current user
  const selectingCollaborators = collaborators.filter(
    c => 
      c.user_id !== user?.id && 
      c.selection_start != null && 
      c.selection_end != null &&
      c.selection_start !== c.selection_end &&
      (!fieldId || c.active_field_id === fieldId)
  );

  if (selectingCollaborators.length === 0 || !getTextPosition) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {selectingCollaborators.map((collaborator) => {
        const startPos = getTextPosition(collaborator.selection_start!);
        const endPos = getTextPosition(collaborator.selection_end!);

        // Simple single-line highlight
        if (startPos.y === endPos.y) {
          return (
            <div
              key={collaborator.user_id}
              className="absolute transition-all duration-100"
              style={{
                left: startPos.x,
                top: startPos.y,
                width: endPos.x - startPos.x,
                height: startPos.height,
                backgroundColor: collaborator.color,
                opacity: 0.3,
                borderRadius: 2,
              }}
            >
              {/* Selection handle at the end */}
              <div
                className="absolute -right-px top-0 w-0.5 rounded-full"
                style={{
                  backgroundColor: collaborator.color,
                  height: startPos.height,
                }}
              />
            </div>
          );
        }

        // Multi-line highlight would need more complex calculation
        return (
          <div
            key={collaborator.user_id}
            className="absolute transition-all duration-100"
            style={{
              left: startPos.x,
              top: startPos.y,
              width: 100,
              height: Math.abs(endPos.y - startPos.y) + endPos.height,
              backgroundColor: collaborator.color,
              opacity: 0.2,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
};

export default SelectionHighlight;
