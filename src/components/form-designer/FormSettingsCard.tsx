import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FormSettingsCardProps {
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

export const FormSettingsCard = ({ title, description, onTitleChange, onDescriptionChange }: FormSettingsCardProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Form Settings</CardTitle>
        <CardDescription>Update the basic details of your form</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => onTitleChange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={3} />
        </div>
      </CardContent>
    </Card>
  );
};

