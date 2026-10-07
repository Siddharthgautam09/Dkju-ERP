'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authUtils';
import Layout from '@/components/Layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Download, 
  User, 
  BookOpen,
  School,
  Phone,
  Mail,
  Award,
  FileText,
  Printer,
  Calendar,
  CheckCircle,
  AlertCircle,
  Trophy,
  Star,
  FileDown
} from 'lucide-react';
import {
  getDocuments,
  updateDocument,
  COLLECTIONS,
} from '@/lib/firestoreService';
import { orderBy, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/authStore';

// Helper function to format dates
const formatDate = (dateValue) => {
  if (!dateValue) return 'Not available';
  
  try {
    if (dateValue && typeof dateValue.toDate === 'function') {
      return dateValue.toDate().toLocaleDateString();
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date error';
  }
};

// Calculate result status based on marks
const calculateResult = (marks, subjects) => {
  if (!marks || !subjects || subjects.length === 0) {
    return { status: 'pending', percentage: 0, grade: 'N/A', totalMarks: 0, obtainedMarks: 0 };
  }

  let totalMaxMarks = 0;
  let totalObtainedMarks = 0;
  let failed = false;

  subjects.forEach(subject => {
    const mark = parseInt(marks[subject.id]) || 0;
    const maxMark = subject.maxMarks || 100;
    const passingMark = Math.ceil(maxMark * 0.33); // 33% passing criteria

    totalMaxMarks += maxMark;
    totalObtainedMarks += mark;

    if (mark < passingMark) {
      failed = true;
    }
  });

  const percentage = totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) : 0;
  
  let grade = 'F';
  if (!failed) {
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C+';
    else if (percentage >= 40) grade = 'C';
    else if (percentage >= 33) grade = 'D';
  }

  return {
    status: failed ? 'failed' : 'passed',
    percentage: parseFloat(percentage),
    grade,
    totalMarks: totalMaxMarks,
    obtainedMarks: totalObtainedMarks
  };
};

export default function Certificates() {
  const { user, role } = useAuth();
  const { userData } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  
  // Data States
  const [examRegistrations, setExamRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [studentDetails, setStudentDetails] = useState({});
  const [exams, setExams] = useState([]);
  const [madrasas, setMadrasas] = useState([]);
  const [examMarks, setExamMarks] = useState({});
  const [publishedResults, setPublishedResults] = useState({});
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedMadrasa, setSelectedMadrasa] = useState('all');
  const [resultStatus, setResultStatus] = useState('all'); // all, passed, failed
  const [certificateStatus, setCertificateStatus] = useState('all'); // all, generated, pending

  // Fetch all exam registrations for eligible classes
  const fetchExamRegistrations = useCallback(async () => {
    try {
      // Eligible classes for certificates (5th, 7th, 10th, 12th)
      const eligibleClasses = ['5', '7', '10', '12'];
      
      const constraints = [orderBy('createdAt', 'desc')];
      const fetchedRegistrations = await getDocuments(COLLECTIONS.EXAM_REGISTRATIONS, constraints);
      
      // Filter for completed payments only
      const paidRegistrations = fetchedRegistrations.filter(registration => 
        registration.paymentStatus === 'completed'
      );
      
      setExamRegistrations(paidRegistrations);
      
      // Fetch student details for each registration
      const studentIds = [...new Set(paidRegistrations.map(r => r.studentId))];
      const studentDetailsMap = {};
      
      for (const studentId of studentIds) {
        if (studentId) {
          try {
            const studentQuery = query(
              collection(db, 'students'),
              where('uid', '==', studentId)
            );
            const studentSnapshot = await getDocs(studentQuery);
            
            if (!studentSnapshot.empty) {
              const studentData = studentSnapshot.docs[0].data();
              // Only include students from eligible classes
              if (eligibleClasses.includes(studentData.classLevel)) {
                studentDetailsMap[studentId] = studentData;
              }
            }
          } catch (error) {
            console.error(`Error fetching student ${studentId}:`, error);
          }
        }
      }
      
      setStudentDetails(studentDetailsMap);
      
      // Filter registrations to only include eligible students
      const eligibleRegistrations = paidRegistrations.filter(registration => 
        studentDetailsMap[registration.studentId]
      );
      
      setExamRegistrations(eligibleRegistrations);
      setFilteredRegistrations(eligibleRegistrations);
      
    } catch (error) {
      console.error('Error fetching exam registrations:', error);
      setError('Failed to fetch registrations');
    }
  }, []);

  // Fetch exams
  const fetchExams = useCallback(async () => {
    try {
      const constraints = [orderBy('createdAt', 'desc')];
      const fetchedExams = await getDocuments(COLLECTIONS.EXAMS, constraints);
      setExams(fetchedExams);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  }, []);

  // Fetch madrasas
  const fetchMadrasas = useCallback(async () => {
    try {
      const madrasaQuery = query(collection(db, 'madrasas'));
      const madrasaSnapshot = await getDocs(madrasaQuery);
      const madrasaList = madrasaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMadrasas(madrasaList);
    } catch (error) {
      console.error('Error fetching madrasas:', error);
    }
  }, []);

  // Fetch exam marks
  const fetchExamMarks = useCallback(async () => {
    try {
      const marksQuery = query(
        collection(db, 'exammarks'),
        where('status', '==', 'saved') // Only final saved marks
      );
      const marksSnapshot = await getDocs(marksQuery);
      const marksMap = {};
      
      marksSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const key = `${data.studentId}_${data.examId}`;
        marksMap[key] = { id: doc.id, ...data };
      });
      
      setExamMarks(marksMap);
    } catch (error) {
      console.error('Error fetching exam marks:', error);
    }
  }, []);

  // Fetch published results
  const fetchPublishedResults = useCallback(async () => {
    try {
      const resultsQuery = query(collection(db, COLLECTIONS.PUBLISHED_RESULTS));
      const resultsSnapshot = await getDocs(resultsQuery);
      const resultsMap = {};
      
      resultsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const key = `${data.studentId}_${data.examId}`;
        resultsMap[key] = { id: doc.id, ...data };
      });
      
      setPublishedResults(resultsMap);
    } catch (error) {
      console.error('Error fetching published results:', error);
    }
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchExamRegistrations(),
        fetchExams(),
        fetchMadrasas(),
        fetchExamMarks(),
        fetchPublishedResults(),
      ]);
      setLoading(false);
    };

    fetchAllData();
  }, [fetchExamRegistrations, fetchExams, fetchMadrasas, fetchExamMarks, fetchPublishedResults]);

  // Filter registrations
  useEffect(() => {
    let filtered = examRegistrations;

    // First filter: Only show students with published results
    filtered = filtered.filter(registration => {
      const key = `${registration.studentId}_${registration.examId}`;
      return publishedResults[key]; // Only include if result is published
    });

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(registration => {
        const student = studentDetails[registration.studentId];
        const searchLower = searchTerm.toLowerCase();
        return (
          registration.studentName?.toLowerCase().includes(searchLower) ||
          registration.studentEmail?.toLowerCase().includes(searchLower) ||
          registration.hallTicketNumber?.toLowerCase().includes(searchLower) ||
          student?.fullName?.toLowerCase().includes(searchLower) ||
          student?.email?.toLowerCase().includes(searchLower) ||
          student?.admissionNumber?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Exam filter
    if (selectedExam !== 'all') {
      filtered = filtered.filter(registration => registration.examId === selectedExam);
    }

    // Class filter
    if (selectedClass !== 'all') {
      filtered = filtered.filter(registration => {
        const student = studentDetails[registration.studentId];
        return student?.classLevel === selectedClass;
      });
    }

    // Madrasa filter
    if (selectedMadrasa !== 'all') {
      filtered = filtered.filter(registration => {
        const student = studentDetails[registration.studentId];
        return student?.madarsaId === selectedMadrasa || registration.madarsaId === selectedMadrasa;
      });
    }

    // Result status filter
    if (resultStatus !== 'all') {
      filtered = filtered.filter(registration => {
        const key = `${registration.studentId}_${registration.examId}`;
        const marks = examMarks[key];
        if (!marks) return false;
        
        const result = calculateResult(marks.marks, marks.subjects);
        return result.status === resultStatus;
      });
    }

    // Certificate status filter
    if (certificateStatus !== 'all') {
      if (certificateStatus === 'generated') {
        filtered = filtered.filter(registration => registration.certificateNumber);
      } else if (certificateStatus === 'pending') {
        filtered = filtered.filter(registration => {
          const key = `${registration.studentId}_${registration.examId}`;
          const marks = examMarks[key];
          const result = marks ? calculateResult(marks.marks, marks.subjects) : null;
          return !registration.certificateNumber && result?.status === 'passed';
        });
      }
    }

    setFilteredRegistrations(filtered);
  }, [examRegistrations, studentDetails, searchTerm, selectedExam, selectedClass, selectedMadrasa, resultStatus, certificateStatus, examMarks, publishedResults]);

  // Generate certificate number
  const generateCertificateNumber = (examId, studentId, classLevel) => {
    const year = new Date().getFullYear();
    const classCode = classLevel ? classLevel.toString().padStart(2, '0') : '00';
    const examCode = examId ? examId.substring(0, 4).toUpperCase() : 'CERT';
    const studentCode = studentId ? studentId.substring(0, 6).toUpperCase() : 'STU000';
    
    return `CERT${year}${classCode}${examCode}${studentCode}`;
  };

  // Generate certificate for single student
  const generateSingleCertificate = async (registration) => {
    try {
      const student = studentDetails[registration.studentId];
      const key = `${registration.studentId}_${registration.examId}`;
      const marks = examMarks[key];
      
      if (!student || !marks) {
        alert('Student details or marks not found');
        return;
      }

      const result = calculateResult(marks.marks, marks.subjects);
      
      if (result.status !== 'passed') {
        alert('Certificate can only be generated for passed students');
        return;
      }

      const certificateNumber = generateCertificateNumber(
        registration.examId,
        registration.studentId,
        student.classLevel
      );

      await updateDocument(COLLECTIONS.EXAM_REGISTRATIONS, registration.id, {
        certificateNumber,
        certificateGeneratedAt: new Date(),
        result: result
      });

      // Update local state
      setExamRegistrations(prev =>
        prev.map(reg =>
          reg.id === registration.id
            ? { ...reg, certificateNumber, certificateGeneratedAt: new Date(), result }
            : reg
        )
      );

      alert('Certificate generated successfully!');
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Failed to generate certificate');
    }
  };

  // Generate certificates in bulk
  const generateBulkCertificates = async () => {
    const eligibleForCertificate = filteredRegistrations.filter(reg => {
      const key = `${reg.studentId}_${reg.examId}`;
      const marks = examMarks[key];
      const result = marks ? calculateResult(marks.marks, marks.subjects) : null;
      return !reg.certificateNumber && result?.status === 'passed';
    });
    
    if (eligibleForCertificate.length === 0) {
      alert('No passed students found without certificates');
      return;
    }

    if (!confirm(`Generate certificates for ${eligibleForCertificate.length} passed students?`)) {
      return;
    }

    setGenerating(true);
    try {
      const updates = [];
      
      for (const registration of eligibleForCertificate) {
        const student = studentDetails[registration.studentId];
        const key = `${registration.studentId}_${registration.examId}`;
        const marks = examMarks[key];
        
        if (student && marks) {
          const result = calculateResult(marks.marks, marks.subjects);
          const certificateNumber = generateCertificateNumber(
            registration.examId,
            registration.studentId,
            student.classLevel
          );

          updates.push({
            id: registration.id,
            certificateNumber,
            certificateGeneratedAt: new Date(),
            result
          });
        }
      }

      // Update in batches
      for (const update of updates) {
        await updateDocument(COLLECTIONS.EXAM_REGISTRATIONS, update.id, {
          certificateNumber: update.certificateNumber,
          certificateGeneratedAt: update.certificateGeneratedAt,
          result: update.result
        });
      }

      // Update local state
      setExamRegistrations(prev =>
        prev.map(reg => {
          const update = updates.find(u => u.id === reg.id);
          return update ? { ...reg, ...update } : reg;
        })
      );

      alert(`Successfully generated ${updates.length} certificates!`);
    } catch (error) {
      console.error('Error generating bulk certificates:', error);
      alert('Failed to generate certificates');
    } finally {
      setGenerating(false);
    }
  };

  // Print certificate
  const printCertificate = (registration) => {
    const student = studentDetails[registration.studentId];
    const exam = exams.find(e => e.id === registration.examId);
    const key = `${registration.studentId}_${registration.examId}`;
    const marks = examMarks[key];
    
    if (!registration.certificateNumber) {
      alert('Certificate not generated yet');
      return;
    }

    const result = registration.result || (marks ? calculateResult(marks.marks, marks.subjects) : null);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Certificate - ${registration.certificateNumber}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 0; padding: 20px; background: #f0f0f0; }
            .certificate { max-width: 900px; margin: 0 auto; background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%); border: 10px solid #0f766e; padding: 40px; position: relative; }
            .certificate::before { content: ''; position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px; border: 3px solid #fbbf24; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 28px; font-weight: bold; color: #0f766e; margin-bottom: 10px; letter-spacing: 2px; }
            .title { font-size: 36px; font-weight: bold; color: #0f766e; margin: 20px 0; text-transform: uppercase; letter-spacing: 2px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1); }
            .subtitle { font-size: 18px; color: #666; margin-bottom: 30px; }
            .content { text-align: center; margin: 40px 0; }
            .student-name { font-size: 32px; font-weight: bold; color: #134e4a; margin: 20px 0; text-decoration: underline; text-decoration-color: #0f766e; text-underline-offset: 8px; text-decoration-thickness: 2px; }
            .achievement { font-size: 20px; line-height: 1.8; margin: 30px 0; }
            .details { display: flex; justify-content: space-between; margin: 40px 0; }
            .detail-box { text-align: center; flex: 1; }
            .detail-label { font-weight: bold; color: #666; font-size: 14px; }
            .detail-value { font-size: 18px; font-weight: bold; color: #1f2937; margin-top: 5px; }
            .footer { display: flex; justify-content: space-between; margin-top: 60px; }
            .signature { text-align: center; }
            .signature-line { border-top: 2px solid #000; width: 200px; margin: 40px auto 10px; }
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(15, 118, 110, 0.08); z-index: 0; font-weight: bold; font-family: 'Times New Roman', serif; }
            .content { position: relative; z-index: 1; }
            @media print { body { background: white; } .certificate { border: 5px solid #1f2937; } }
          </style>
        </head>
        <body>
          <div class="watermark">DKJU</div>
          <div class="certificate">
            <div class="header">
              <div class="logo">DKJU - Darul Uloom Kareem Al Jamiat</div>
              <div style="font-size: 14px; color: #0f766e; font-weight: 600; margin: 8px 0;">Smart Islamic Education Platform</div>
              <div class="title">Certificate of Excellence</div>
              <div class="subtitle">This is to certify that</div>
            </div>
            
            <div class="content">
              <div class="student-name">${registration.studentName || student?.fullName || ''}</div>
              
              <div class="achievement">
                has successfully completed the <strong>${exam?.title || 'Examination'}</strong>
                for <strong>Class ${student?.classLevel || ''}</strong> and has been awarded
                <strong>Grade ${result?.grade || 'A'}</strong> with <strong>${result?.percentage || '0'}%</strong> marks.
              </div>
              
              <div class="achievement">
                The student has demonstrated excellence in academic performance and
                is hereby awarded this certificate in recognition of their achievement.
              </div>
              
              <div class="details">
                <div class="detail-box">
                  <div class="detail-label">Certificate Number</div>
                  <div class="detail-value">${registration.certificateNumber}</div>
                </div>
                <div class="detail-box">
                  <div class="detail-label">Class</div>
                  <div class="detail-value">Class ${student?.classLevel || ''}</div>
                </div>
                <div class="detail-box">
                  <div class="detail-label">Percentage</div>
                  <div class="detail-value">${result?.percentage || '0'}%</div>
                </div>
                <div class="detail-box">
                  <div class="detail-label">Grade</div>
                  <div class="detail-value">${result?.grade || 'A'}</div>
                </div>
              </div>
              
              <div class="details">
                <div class="detail-box">
                  <div class="detail-label">Student ID</div>
                  <div class="detail-value">${student?.admissionNumber || registration.studentId}</div>
                </div>
                <div class="detail-box">
                  <div class="detail-label">Madrasa</div>
                  <div class="detail-value">${student?.madarsaId || registration.madarsaId || ''}</div>
                </div>
                <div class="detail-box">
                  <div class="detail-label">Date of Issue</div>
                  <div class="detail-value">${formatDate(registration.certificateGeneratedAt || new Date())}</div>
                </div>
                <div class="detail-box">
                  <div class="detail-label">Academic Year</div>
                  <div class="detail-value">${new Date().getFullYear()}</div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div class="signature">
                <div class="signature-line"></div>
                <div style="font-weight: bold;">Principal</div>
                <div style="font-size: 14px; color: #666;">Darul Uloom Kareem Al Jamiat</div>
              </div>
              <div class="signature">
                <div class="signature-line"></div>
                <div style="font-weight: bold;">Controller of Examinations</div>
                <div style="font-size: 14px; color: #666;">Pariksha Board</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Download certificate as PDF
  const downloadCertificatePDF = (registration) => {
    const student = studentDetails[registration.studentId];
    const exam = exams.find(e => e.id === registration.examId);
    const key = `${registration.studentId}_${registration.examId}`;
    const publishedResult = publishedResults[key];
    
    if (!registration.certificateNumber) {
      alert('Certificate not generated yet');
      return;
    }

    const result = publishedResult?.result || registration.result;

    // Create certificate HTML for PDF download
    const certificateHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Certificate - ${registration.certificateNumber}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Times New Roman', serif;
              margin: 0;
              padding: 0;
              background: white;
              color: #000;
            }
            .certificate {
              width: 100%;
              height: 100vh;
              background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%);
              border: 8px solid #0f766e;
              padding: 30px;
              box-sizing: border-box;
              position: relative;
            }
            .certificate::before {
              content: '';
              position: absolute;
              top: 15px;
              left: 15px;
              right: 15px;
              bottom: 15px;
              border: 3px solid #fbbf24;
              border-radius: 8px;
              z-index: 1;
            }
            .content {
              position: relative;
              z-index: 2;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .logo-container {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
              margin-bottom: 15px;
            }
            .logo-image {
              width: 60px;
              height: 60px;
              border-radius: 8px;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .logo-text {
              text-align: left;
            }
            .logo-title {
              font-size: 28px;
              font-weight: bold;
              color: #0f766e;
              letter-spacing: 2px;
            }
            .logo-subtitle {
              font-size: 16px;
              color: #134e4a;
              font-weight: 600;
              margin-top: 2px;
            }
            .organization {
              font-size: 16px;
              color: #0f766e;
              margin-bottom: 15px;
              font-weight: 500;
              font-style: italic;
            }
            .title {
              font-size: 32px;
              font-weight: bold;
              color: #0f766e;
              margin: 20px 0;
              text-transform: uppercase;
              letter-spacing: 2px;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            }
            .subtitle {
              font-size: 16px;
              color: #374151;
              margin-bottom: 20px;
              font-weight: 500;
            }
            .main-content {
              text-align: center;
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .student-name {
              font-size: 28px;
              font-weight: bold;
              color: #134e4a;
              margin: 20px 0;
              text-decoration: underline;
              text-decoration-color: #0f766e;
              text-underline-offset: 8px;
              text-decoration-thickness: 2px;
            }
            .achievement {
              font-size: 16px;
              line-height: 1.6;
              margin: 20px 0;
              text-align: center;
            }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin: 30px 0;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .detail-box {
              text-align: center;
            }
            .detail-label {
              font-weight: bold;
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
            }
            .detail-value {
              font-size: 16px;
              font-weight: bold;
              color: #1f2937;
              margin-top: 5px;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 40px;
            }
            .signature {
              text-align: center;
              min-width: 150px;
            }
            .signature-line {
              border-top: 2px solid #000;
              width: 150px;
              margin: 30px auto 10px;
            }
            .signature-title {
              font-weight: bold;
              font-size: 14px;
            }
            .signature-subtitle {
              font-size: 12px;
              color: #666;
              margin-top: 2px;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 100px;
              color: rgba(15, 118, 110, 0.08);
              z-index: 1;
              font-weight: bold;
              font-family: 'Times New Roman', serif;
            }
            .certificate-number {
              position: absolute;
              bottom: 20px;
              right: 20px;
              font-size: 12px;
              color: #666;
              z-index: 2;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="watermark">DKJU</div>
            <div class="content">
              <div class="header">
                <div class="logo-container">
                  <img src="/favicon.ico" alt="DKJU Logo" class="logo-image" />
                  <div class="logo-text">
                    <div class="logo-title">DKJU</div>
                    <div class="logo-subtitle">Darul Uloom Kareem Al Jamiat</div>
                  </div>
                </div>
                <div class="organization">Smart Islamic Education Platform</div>
                <div class="title">Certificate of Achievement</div>
                <div class="subtitle">This is to certify that</div>
              </div>
              
              <div class="main-content">
                <div class="student-name">${registration.studentName || student?.fullName || ''}</div>
                
                <div class="achievement">
                  has successfully completed the <strong>${exam?.title || 'Academic Examination'}</strong>
                  for <strong>Class ${student?.classLevel || ''}</strong> and has been awarded
                  <strong>Grade ${result?.grade || 'A'}</strong> with <strong>${result?.percentage || '0'}%</strong> marks.
                </div>
                
                <div class="achievement">
                  The student has demonstrated excellence in academic performance and Islamic studies
                  and is hereby awarded this certificate in recognition of their outstanding achievement.
                </div>
                
                <div class="details-grid">
                  <div class="detail-box">
                    <div class="detail-label">Certificate No.</div>
                    <div class="detail-value">${registration.certificateNumber}</div>
                  </div>
                  <div class="detail-box">
                    <div class="detail-label">Class</div>
                    <div class="detail-value">Class ${student?.classLevel || ''}</div>
                  </div>
                  <div class="detail-box">
                    <div class="detail-label">Percentage</div>
                    <div class="detail-value">${result?.percentage || '0'}%</div>
                  </div>
                  <div class="detail-box">
                    <div class="detail-label">Grade</div>
                    <div class="detail-value">${result?.grade || 'A'}</div>
                  </div>
                </div>
                
                <div class="details-grid">
                  <div class="detail-box">
                    <div class="detail-label">Student ID</div>
                    <div class="detail-value">${student?.admissionNumber || registration.studentId}</div>
                  </div>
                  <div class="detail-box">
                    <div class="detail-label">Madrasa</div>
                    <div class="detail-value">${student?.madarsaId || registration.madarsaId || ''}</div>
                  </div>
                  <div class="detail-box">
                    <div class="detail-label">Issue Date</div>
                    <div class="detail-value">${formatDate(registration.certificateGeneratedAt || new Date())}</div>
                  </div>
                  <div class="detail-box">
                    <div class="detail-label">Academic Year</div>
                    <div class="detail-value">${new Date().getFullYear()}-${new Date().getFullYear() + 1}</div>
                  </div>
                </div>
              </div>
              
              <div class="footer">
                <div class="signature">
                  <div class="signature-line"></div>
                  <div class="signature-title">Principal</div>
                  <div class="signature-subtitle">Darul Uloom Kareem Al Jamiat</div>
                </div>
                <div class="signature">
                  <div class="signature-line"></div>
                  <div class="signature-title">Controller of Examinations</div>
                  <div class="signature-subtitle">Pariksha Board Convener</div>
                </div>
              </div>
            </div>
            <div class="certificate-number">Certificate No: ${registration.certificateNumber}</div>
          </div>
        </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([certificateHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate-${registration.certificateNumber}-${registration.studentName || student?.fullName || 'Student'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download certificates list
  const downloadCertificatesList = () => {
    const generatedCertificates = filteredRegistrations.filter(reg => reg.certificateNumber);
    
    if (generatedCertificates.length === 0) {
      alert('No certificates generated yet');
      return;
    }

    const headers = [
      'Certificate Number',
      'Student Name',
      'Class',
      'Madrasa',
      'Exam Title',
      'Grade',
      'Percentage',
      'Status',
      'Generated Date'
    ];

    const csvData = generatedCertificates.map(registration => {
      const student = studentDetails[registration.studentId] || {};
      const exam = exams.find(e => e.id === registration.examId);
      const key = `${registration.studentId}_${registration.examId}`;
      const marks = examMarks[key];
      const result = registration.result || (marks ? calculateResult(marks.marks, marks.subjects) : null);
      
      return [
        registration.certificateNumber || '',
        registration.studentName || student.fullName || '',
        student.classLevel || '',
        student.madarsaId || registration.madarsaId || '',
        exam?.title || '',
        result?.grade || '',
        result?.percentage || '',
        result?.status || '',
        registration.certificateGeneratedAt ? formatDate(registration.certificateGeneratedAt) : ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `certificates_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = {
    total: filteredRegistrations.length,
    passed: filteredRegistrations.filter(reg => {
      const key = `${reg.studentId}_${reg.examId}`;
      const publishedResult = publishedResults[key];
      return publishedResult?.result?.status === 'passed';
    }).length,
    certificatesGenerated: filteredRegistrations.filter(reg => reg.certificateNumber).length,
    pending: filteredRegistrations.filter(reg => {
      const key = `${reg.studentId}_${reg.examId}`;
      const publishedResult = publishedResults[key];
      return !reg.certificateNumber && publishedResult?.result?.status === 'passed';
    }).length
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading certificates data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Certificates Generation
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Generate certificates for passed students with published results only (Classes 5th, 7th, 10th, and 12th)
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                <div className="ml-3 sm:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Students</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center">
                <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                <div className="ml-3 sm:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Passed Students</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.passed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center">
                <Award className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
                <div className="ml-3 sm:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Certificates Generated</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.certificatesGenerated}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center">
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
                <div className="ml-3 sm:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending Certificates</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions and Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-lg sm:text-xl">Certificates Management</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={generateBulkCertificates}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={stats.pending === 0 || generating}
                  size="sm"
                >
                  <Award className="h-4 w-4 mr-2" />
                  {generating ? 'Generating...' : `Generate Bulk (${stats.pending})`}
                </Button>
                <Button 
                  onClick={downloadCertificatesList}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={stats.certificatesGenerated === 0}
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download List
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="search" className="text-sm">Search Students</Label>
                <Input
                  id="search"
                  placeholder="Name, email, certificate..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="exam-filter" className="text-sm">Filter by Exam</Label>
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select exam" />
                  </SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value="all">All Exams</SelectItem>
                    {exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="class-filter" className="text-sm">Filter by Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="5">Class 5th</SelectItem>
                    <SelectItem value="7">Class 7th</SelectItem>
                    <SelectItem value="10">Class 10th</SelectItem>
                    <SelectItem value="12">Class 12th</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="madrasa-filter" className="text-sm">Filter by Madrasa</Label>
                <Select value={selectedMadrasa} onValueChange={setSelectedMadrasa}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select madrasa" />
                  </SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value="all">All Madrasas</SelectItem>
                    {madrasas.map((madrasa) => (
                      <SelectItem key={madrasa.id} value={madrasa.id}>
                        {madrasa.name || madrasa.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="result-filter" className="text-sm">Result Status</Label>
                <Select value={resultStatus} onValueChange={setResultStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="certificate-filter" className="text-sm">Certificate Status</Label>
                <Select value={certificateStatus} onValueChange={setCertificateStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="generated">Generated</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>Students for Certificates ({filteredRegistrations.length})</CardTitle>
            <CardDescription>
              Students from eligible classes (5th, 7th, 10th, 12th) with published results only
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRegistrations.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No students found for certificate generation</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRegistrations.map((registration) => {
                  const exam = exams.find(e => e.id === registration.examId);
                  const student = studentDetails[registration.studentId] || {};
                  const key = `${registration.studentId}_${registration.examId}`;
                  const marks = examMarks[key];
                  const publishedResult = publishedResults[key];
                  const result = publishedResult?.result || registration.result || (marks ? calculateResult(marks.marks, marks.subjects) : null);
                  
                  return (
                    <div key={registration.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                            <h4 className="font-semibold text-base sm:text-lg truncate">
                              {registration.studentName || student.fullName}
                            </h4>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="border-blue-500 text-blue-700">
                                Class {student.classLevel}
                              </Badge>
                              {result ? (
                                result.status === 'passed' ? (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Passed ({result.grade})
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Failed
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="secondary">
                                  Result Pending
                                </Badge>
                              )}
                              {registration.certificateNumber && (
                                <Badge variant="default" className="bg-purple-600">
                                  <Award className="h-3 w-3 mr-1" />
                                  Certificate Generated
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                              {registration.certificateNumber && (
                                <p className="flex items-center gap-1">
                                  <Award className="h-3 w-3" />
                                  <strong>Certificate:</strong> {registration.certificateNumber}
                                </p>
                              )}
                              {result && (
                                <>
                                  <p className="flex items-center gap-1">
                                    <Star className="h-3 w-3" />
                                    <strong>Grade:</strong> {result.grade}
                                  </p>
                                  <p className="flex items-center gap-1">
                                    <Trophy className="h-3 w-3" />
                                    <strong>Percentage:</strong> {result.percentage}%
                                  </p>
                                </>
                              )}
                              <p className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <strong>Email:</strong> {registration.studentEmail || student.email}
                              </p>
                              <p className="flex items-center gap-1">
                                <School className="h-3 w-3" />
                                <strong>Madrasa:</strong> {student.madarsaId || registration.madarsaId}
                              </p>
                              {student.admissionNumber && (
                                <p className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  <strong>Admission:</strong> {student.admissionNumber}
                                </p>
                              )}
                            </div>
                            <p><strong>Exam:</strong> {exam?.title || 'Unknown Exam'}</p>
                            {registration.certificateGeneratedAt && (
                              <p><strong>Certificate Generated:</strong> {formatDate(registration.certificateGeneratedAt)}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 flex-shrink-0">
                          {result?.status === 'passed' && !registration.certificateNumber && (
                            <Button
                              onClick={() => generateSingleCertificate(registration)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Award className="h-4 w-4 mr-2" />
                              Generate
                            </Button>
                          )}
                          {registration.certificateNumber && (
                            <>
                              <Button
                                onClick={() => printCertificate(registration)}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </Button>
                              <Button
                                onClick={() => downloadCertificatePDF(registration)}
                                size="sm"
                                variant="outline"
                                className="border-green-500 text-green-700 hover:bg-green-50"
                              >
                                <FileDown className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}