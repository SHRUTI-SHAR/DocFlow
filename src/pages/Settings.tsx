import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserPreferences } from "@/hooks/useLocalStorage";
import { Settings as SettingsIcon, Save, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const { updatePreference, updatePreferences, resetPreferences, preferences } = useUserPreferences();
  const { toast } = useToast();
  
  // Helper function to read directly from localStorage to ensure we get latest values
  const getSavedPreference = (key: string, defaultValue: number): number => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = window.localStorage.getItem('user_preferences');
      if (stored) {
        const prefs = JSON.parse(stored);
        const value = prefs[key];
        // Return the value if it exists and is a valid number, otherwise return default
        if (value !== undefined && value !== null && typeof value === 'number') {
          return value;
        }
      }
    } catch (e) {
      console.error('Error reading preferences:', e);
    }
    return defaultValue;
  };

  // Helper function to read boolean preferences from localStorage
  const getSavedBooleanPreference = (key: string, defaultValue: boolean): boolean => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = window.localStorage.getItem('user_preferences');
      if (stored) {
        const prefs = JSON.parse(stored);
        const value = prefs[key];
        // Return the value if it exists and is a valid boolean, otherwise return default
        if (value !== undefined && value !== null && typeof value === 'boolean') {
          return value;
        }
      }
    } catch (e) {
      console.error('Error reading preferences:', e);
    }
    return defaultValue;
  };

  // Initialize state by reading directly from localStorage on mount
  // This ensures we always get the latest saved values when navigating back
  const initialWorkers = getSavedPreference('pdfProcessingMaxWorkers', 10);
  const initialThreads = getSavedPreference('pdfProcessingMaxThreads', 10);
  const initialYoloEnabled = getSavedBooleanPreference('yoloSignatureEnabled', true);
  const initialFaceEnabled = getSavedBooleanPreference('yoloFaceEnabled', true);
  
  const [maxWorkers, setMaxWorkers] = useState<number>(initialWorkers);
  const [maxWorkersInput, setMaxWorkersInput] = useState<string>(initialWorkers.toString());
  const [maxThreads, setMaxThreads] = useState<number>(initialThreads);
  const [maxThreadsInput, setMaxThreadsInput] = useState<string>(initialThreads.toString());
  const [yoloSignatureEnabled, setYoloSignatureEnabled] = useState<boolean>(initialYoloEnabled);
  const [yoloFaceEnabled, setYoloFaceEnabled] = useState<boolean>(initialFaceEnabled);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track if user is actively editing to prevent guard from interfering
  const isEditingRef = useRef(false);
  // Track if we've initialized to prevent resets from preferences changes
  const isInitialized = useRef(false);
  const savedValuesRef = useRef<{ workers: number; threads: number; yoloEnabled: boolean; faceEnabled: boolean } | null>(null);

  // Sync from localStorage ONLY on mount (when component first loads)
  // This ensures saved values are loaded when you navigate back to settings
  // But prevents resets while user is typing
  useEffect(() => {
    if (!isInitialized.current) {
      const savedWorkers = getSavedPreference('pdfProcessingMaxWorkers', 10);
      const savedThreads = getSavedPreference('pdfProcessingMaxThreads', 10);
      const savedYoloEnabled = getSavedBooleanPreference('yoloSignatureEnabled', true);
      const savedFaceEnabled = getSavedBooleanPreference('yoloFaceEnabled', true);
      setMaxWorkers(savedWorkers);
      setMaxWorkersInput(savedWorkers.toString());
      setMaxThreads(savedThreads);
      setMaxThreadsInput(savedThreads.toString());
      setYoloSignatureEnabled(savedYoloEnabled);
      setYoloFaceEnabled(savedFaceEnabled);
      savedValuesRef.current = { workers: savedWorkers, threads: savedThreads, yoloEnabled: savedYoloEnabled, faceEnabled: savedFaceEnabled };
      isInitialized.current = true;
      console.log('Settings initialized:', { savedWorkers, savedThreads, savedYoloEnabled, savedFaceEnabled });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount to load saved preferences
  
  // Guard against accidental resets - if state gets reset to default unexpectedly, restore saved value
  // This prevents the value from resetting to 100 or 10 when preferences object changes
  // BUT only if user is NOT actively editing
  useEffect(() => {
    if (isInitialized.current && savedValuesRef.current && !isEditingRef.current) {
      // Only restore if the value was reset to a default (10 or 100) AND we have a different saved value
      // This prevents restoring when user intentionally sets it to 10 or 100
      const workersChanged = (maxWorkers === 10 || maxWorkers === 100) && 
                            savedValuesRef.current.workers !== 10 && 
                            savedValuesRef.current.workers !== 100 &&
                            savedValuesRef.current.workers !== maxWorkers;
      
      const threadsChanged = (maxThreads === 10 || maxThreads === 100) && 
                            savedValuesRef.current.threads !== 10 && 
                            savedValuesRef.current.threads !== 100 &&
                            savedValuesRef.current.threads !== maxThreads;
      
      if (workersChanged) {
        console.warn('maxWorkers was reset unexpectedly to', maxWorkers, ', restoring:', savedValuesRef.current.workers);
        setMaxWorkers(savedValuesRef.current.workers);
        setMaxWorkersInput(savedValuesRef.current.workers.toString());
      }
      if (threadsChanged) {
        console.warn('maxThreads was reset unexpectedly to', maxThreads, ', restoring:', savedValuesRef.current.threads);
        setMaxThreads(savedValuesRef.current.threads);
        setMaxThreadsInput(savedValuesRef.current.threads.toString());
      }
    }
  }, [maxWorkers, maxThreads]);

  const handleSave = () => {
    // Validate and update from input values first (in case user clicked Save before onBlur)
    let finalWorkers = maxWorkers;
    let finalThreads = maxThreads;
    
    // Parse and validate maxWorkers from input
    const workersInputValue = maxWorkersInput.trim();
    if (workersInputValue !== '') {
      const workersNum = parseInt(workersInputValue, 10);
      if (!isNaN(workersNum) && workersNum >= 1 && workersNum <= 50) {
        finalWorkers = workersNum;
        setMaxWorkers(finalWorkers);
        setMaxWorkersInput(finalWorkers.toString());
        // Sync threads to same value
        finalThreads = workersNum;
        setMaxThreads(finalThreads);
        setMaxThreadsInput(finalThreads.toString());
      } else {
        toast({
          title: "Invalid value",
          description: "Concurrent workers must be between 1 and 50",
          variant: "destructive",
        });
        return;
      }
    } else {
      toast({
        title: "Invalid value",
        description: "Concurrent workers cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    // maxThreads is now synced with maxWorkers (same value for both)
    // No separate validation needed
    
    // Use the validated final values
    const workersToSave = finalWorkers;
    const threadsToSave = finalThreads; // Same as finalWorkers now
    const yoloEnabledToSave = yoloSignatureEnabled;
    const faceEnabledToSave = yoloFaceEnabled;

    setIsSaving(true);
    isEditingRef.current = false; // User finished editing, save now
    try {
      // Update saved values ref first (use the validated final values)
      savedValuesRef.current = { workers: workersToSave, threads: threadsToSave, yoloEnabled: yoloEnabledToSave, faceEnabled: faceEnabledToSave };
      
      // Save both preferences atomically by reading current prefs and updating both at once
      // Save directly to localStorage first (this is the source of truth)
      if (typeof window !== 'undefined') {
        try {
          const stored = window.localStorage.getItem('user_preferences');
          let currentPrefs = {};
          if (stored) {
            currentPrefs = JSON.parse(stored);
          }
          
          // Update all values in a single atomic operation (use validated final values)
          const updatedPrefs = {
            ...currentPrefs,
            pdfProcessingMaxWorkers: workersToSave,
            pdfProcessingMaxThreads: threadsToSave,
            yoloSignatureEnabled: yoloEnabledToSave,
            yoloFaceEnabled: faceEnabledToSave
          };
          
          // Save directly to localStorage (this is the source of truth)
          window.localStorage.setItem('user_preferences', JSON.stringify(updatedPrefs));
          
          // Update the hook's state by reading back from localStorage to ensure consistency
          // This ensures the hook state matches what we just saved
          const updatedPrefsString = window.localStorage.getItem('user_preferences');
          if (updatedPrefsString) {
            const finalPrefs = JSON.parse(updatedPrefsString);
            // Update hook state with the complete preferences object to avoid merge issues
            updatePreferences(finalPrefs);
          }
        } catch (e) {
          console.error('Error saving preferences directly:', e);
          // Fallback to hook-based save (use validated final values)
          updatePreference('pdfProcessingMaxWorkers', workersToSave);
          updatePreference('pdfProcessingMaxThreads', threadsToSave);
          updatePreference('yoloSignatureEnabled', yoloEnabledToSave);
          updatePreference('yoloFaceEnabled', faceEnabledToSave);
        }
      } else {
        // Fallback if window is not available (use validated final values)
        updatePreference('pdfProcessingMaxWorkers', workersToSave);
        updatePreference('pdfProcessingMaxThreads', threadsToSave);
        updatePreference('yoloSignatureEnabled', yoloEnabledToSave);
        updatePreference('yoloFaceEnabled', faceEnabledToSave);
      }
      
      // Sync input states to match saved numeric values (use validated final values)
      setMaxWorkersInput(workersToSave.toString());
      setMaxThreadsInput(threadsToSave.toString());
      
      // Double-check: verify the save worked by reading back from localStorage
      setTimeout(() => {
        const savedWorkers = getSavedPreference('pdfProcessingMaxWorkers', 10);
        const savedThreads = getSavedPreference('pdfProcessingMaxThreads', 10);
        const savedYoloEnabled = getSavedBooleanPreference('yoloSignatureEnabled', true);
        const savedFaceEnabled = getSavedBooleanPreference('yoloFaceEnabled', true);
        if (savedWorkers !== workersToSave || savedThreads !== threadsToSave || savedYoloEnabled !== yoloEnabledToSave || savedFaceEnabled !== faceEnabledToSave) {
          console.warn('Settings may not have saved correctly. Expected:', { workersToSave, threadsToSave, yoloEnabledToSave, faceEnabledToSave }, 'Got:', { savedWorkers, savedThreads, savedYoloEnabled, savedFaceEnabled });
          // If save failed, restore the saved values
          if (savedWorkers !== workersToSave) {
            setMaxWorkers(savedWorkers);
            setMaxWorkersInput(savedWorkers.toString());
          }
          if (savedThreads !== threadsToSave) {
            setMaxThreads(savedThreads);
            setMaxThreadsInput(savedThreads.toString());
          }
          if (savedYoloEnabled !== yoloEnabledToSave) {
            setYoloSignatureEnabled(savedYoloEnabled);
          }
          if (savedFaceEnabled !== faceEnabledToSave) {
            setYoloFaceEnabled(savedFaceEnabled);
          }
        } else {
          console.log('Settings saved successfully:', { savedWorkers, savedThreads, savedYoloEnabled, savedFaceEnabled });
        }
      }, 100);
      
      toast({
        title: "Settings saved",
        description: `PDF processing settings saved: ${workersToSave} concurrent workers, signature detection ${yoloEnabledToSave ? 'enabled' : 'disabled'}, photo ID detection ${faceEnabledToSave ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setMaxWorkers(10);
    setMaxWorkersInput('10');
    setMaxThreads(10);
    setMaxThreadsInput('10');
    setYoloSignatureEnabled(true);
    setYoloFaceEnabled(true);
    updatePreference('pdfProcessingMaxWorkers', 10);
    updatePreference('pdfProcessingMaxThreads', 10);
    updatePreference('yoloSignatureEnabled', true);
    updatePreference('yoloFaceEnabled', true);
    savedValuesRef.current = { workers: 10, threads: 10, yoloEnabled: true, faceEnabled: true };
    toast({
      title: "Settings reset",
      description: "PDF processing settings reset to default (10 concurrent workers, signature and photo ID detection enabled)",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure application preferences and processing options
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PDF Processing Settings</CardTitle>
          <CardDescription>
            Configure parallel processing options for PDF document extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxWorkers">
                Concurrent Workers (Pages Processed in Parallel)
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="maxWorkers"
                  type="number"
                  min="1"
                  max="50"
                  value={maxWorkersInput}
                  onChange={(e) => {
                    isEditingRef.current = true; // User is actively editing
                    const inputValue = e.target.value;
                    // Allow empty string and any input while typing
                    setMaxWorkersInput(inputValue);
                    // Also sync to threads (they use the same value)
                    setMaxThreadsInput(inputValue);
                    // Reset editing flag after a short delay to allow guard to work again
                    setTimeout(() => {
                      isEditingRef.current = false;
                    }, 500);
                  }}
                  onBlur={(e) => {
                    isEditingRef.current = false; // User finished editing this field
                    const inputValue = e.target.value.trim();
                    if (inputValue === '') {
                      // If empty, restore the current value
                      setMaxWorkersInput(maxWorkers.toString());
                      setMaxThreadsInput(maxWorkers.toString());
                    } else {
                      const numValue = parseInt(inputValue, 10);
                      if (!isNaN(numValue) && numValue >= 1 && numValue <= 50) {
                        setMaxWorkers(numValue);
                        setMaxWorkersInput(numValue.toString());
                        // Sync threads to same value (backend uses whichever is set)
                        setMaxThreads(numValue);
                        setMaxThreadsInput(numValue.toString());
                      } else {
                        // Invalid value, restore the current value
                        setMaxWorkersInput(maxWorkers.toString());
                        setMaxThreadsInput(maxWorkers.toString());
                        toast({
                          title: "Invalid value",
                          description: "Please enter a number between 1 and 50",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  Number of pages processed simultaneously (1-50)
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Controls how many PDF pages are processed in parallel. This affects all stages: PDF conversion, image encoding, and LLM API calls.
                <br /><br />
                <strong>⚠️ Important:</strong> Higher values = more concurrent LLM API calls = potential rate limiting from your LLM provider.
                <br />
                <strong>Recommended:</strong> 10-20 for most APIs, 5-10 if you experience timeouts or rate limits.
              </p>
            </div>

            {/* Hidden input to maintain backward compatibility with maxThreads preference */}
            <input type="hidden" value={maxThreadsInput} />

            <div className="space-y-2">
              <Label htmlFor="yoloSignatureEnabled">
                Signature Detection
              </Label>
              <div className="flex items-center gap-4">
                <Switch
                  id="yoloSignatureEnabled"
                  checked={yoloSignatureEnabled}
                  onCheckedChange={(checked) => {
                    setYoloSignatureEnabled(checked);
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  Enable automatic signature detection and extraction from documents
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, signatures are automatically detected in documents and cropped for display in the UI. 
                Requires a trained signature detection model. Disable if you don't have a model or want to skip signature detection.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yoloFaceEnabled">
                Photo ID / Face Detection
              </Label>
              <div className="flex items-center gap-4">
                <Switch
                  id="yoloFaceEnabled"
                  checked={yoloFaceEnabled}
                  onCheckedChange={(checked) => {
                    setYoloFaceEnabled(checked);
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  Enable automatic photo ID / face detection and extraction from documents
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, photos and faces are automatically detected in documents and cropped for display in the UI. 
                Useful for extracting passport photos, ID card photos, or any person's photo from documents.
              </p>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Current Configuration:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Concurrent Workers: {maxWorkers} pages in parallel</li>
                <li>• Signature Detection: {yoloSignatureEnabled ? 'Enabled' : 'Disabled'}</li>
                <li>• Photo ID Detection: {yoloFaceEnabled ? 'Enabled' : 'Disabled'}</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Tip: If you see "High TTFB" warnings or timeouts, try reducing the concurrent workers to 10-15.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

