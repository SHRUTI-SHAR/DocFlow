import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Workflow, CheckCircle, ArrowRight, Layout, FormInput, Layers, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const HeroSection = () => {
  const navigate = useNavigate();
  const features = [
    {
      icon: Layout,
      title: "Create Templates",
      description: "AI-powered template creation from any document with smart field detection and mapping"
    },
    {
      icon: FormInput,
      title: "Generate Forms",
      description: "Transform templates into dynamic, validated web forms instantly"
    },
    {
      icon: Layers,
      title: "Build Applications",
      description: "Combine multiple forms into comprehensive application workflows"
    },
    {
      icon: Brain,
      title: "Extract & Process",
      description: "Use templates to intelligently extract data from uploaded documents with AI precision"
    }
  ];

  return (
    <section className="relative py-20 px-4 bg-gradient-hero overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.1)_50%,transparent_60%)] bg-[length:20px_20px]"></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            AI-Powered Template to 
            <span className="block bg-gradient-to-r from-secondary-light to-white bg-clip-text text-transparent">
              Application Platform
            </span>
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8 leading-relaxed">
            Create intelligent templates from any document, generate dynamic forms, build comprehensive 
            applications, and use templates to extract data from uploaded documents with AI-powered precision and automation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" className="bg-white text-primary hover:bg-white/95 hover:scale-[1.02] transition-all duration-200" onClick={() => navigate('/templates')}>
              Start with Templates
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="hero" size="xl" className="bg-white text-primary hover:bg-white/95 hover:scale-[1.02] transition-all duration-200" onClick={() => navigate('/upload')}>
              Transform Document
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Feature Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-16">
          {features.map((feature, index) => (
            <Card key={feature.title} className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center hover:bg-white/15 transition-smooth">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-white/80 text-sm">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};