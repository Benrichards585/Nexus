import React, { useState, useEffect } from 'react';
import InputForm from './InputForm';
import AIAssist from './AIAssist';
import { PROGRAM_TYPES, TRAINING_AUDIENCES, OUTPUT_FORMATS } from './schema';

const emptyFormData = () => ({
  programType: PROGRAM_TYPES[0],
  trainingAudience: TRAINING_AUDIENCES[1],
  outputFormat: OUTPUT_FORMATS[0],
  additionalContext: '',
});

export default function TrainingGenerator({ data, setData, initiative, moduleId }) {
  const [formData, setFormData] = useState(data?.formData || emptyFormData());
  const [templateFile, setTemplateFile] = useState(null);
  const [sourceFile, setSourceFile] = useState(null);
  const [sourceText, setSourceText] = useState(data?.sourceText || '');
  const [generatedTraining, setGeneratedTraining] = useState(data?.generatedTraining || null);

  useEffect(() => {
    setData({ formData, sourceText, generatedTraining });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, sourceText, generatedTraining]);

  return (
    <div className="space-y-6 max-w-screen-xl slide-up">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Training Generator</h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Generate training materials from source documents — powered by AI
        </p>
      </div>

      <InputForm
        formData={formData}
        setFormData={setFormData}
        templateFile={templateFile}
        setTemplateFile={setTemplateFile}
        sourceFile={sourceFile}
        setSourceFile={setSourceFile}
        sourceText={sourceText}
        setSourceText={setSourceText}
      />

      <AIAssist
        formData={formData}
        sourceText={sourceText}
        templateFile={templateFile}
        generatedTraining={generatedTraining}
        setGeneratedTraining={setGeneratedTraining}
        initiative={initiative}
        moduleId={moduleId}
      />
    </div>
  );
}
