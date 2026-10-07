'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Book, FileText, GraduationCap, BookOpen, Video } from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useAuthStore from '@/lib/authStore';
import Layout from '@/components/Layout';
import { toast } from 'sonner';

const CLASS_LEVELS = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'
];

export default function TeacherSmartClassPage() {
  const { userData } = useAuthStore();
  const [selectedClass, setSelectedClass] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [syllabusContent, setSyllabusContent] = useState([]);
  const [studyContent, setStudyContent] = useState([]);
  const [loading, setLoading] = useState(false);

  // Set default class from user data or first class
  useEffect(() => {
    if (userData?.classLevel) {
      setSelectedClass(userData.classLevel.replace('Class ', ''));
    } else {
      setSelectedClass('1');
    }
  }, [userData]);

  const fetchContent = useCallback(async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    try {
    let content = [];
    
    if (activeTab === 'all') {
      // Fetch from both collections
      const syllabusQuery = query(
        collection(db, 'smartClassSyllabus'),
        where('class', '==', selectedClass),
        orderBy('createdAt', 'desc')
      );
      
      const contentsQuery = query(
        collection(db, 'smartClassContents'),
        where('class', '==', selectedClass),
        orderBy('createdAt', 'desc')
      );
      
      const [syllabusSnapshot, contentsSnapshot] = await Promise.all([
        getDocs(syllabusQuery),
        getDocs(contentsQuery)
      ]);
      
      const syllabusData = syllabusSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'syllabus'
      }));
      
      const contentsData = contentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'contents'
      }));
      
      content = [...syllabusData, ...contentsData].sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      
      setStudyContent(content);
    } else {
      const collectionName = activeTab === 'syllabus' ? 'smartClassSyllabus' : 'smartClassContents';
    //   console.log(selectedClass)
      const contentQuery = query(
        collection(db, collectionName),
        where('class', '==', selectedClass),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(contentQuery);
      const content = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    //   console.log(content)

      if (activeTab === 'syllabus') {
        setSyllabusContent(content);
      } else {
        setStudyContent(content);
      }
    }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [selectedClass, activeTab]);

  // Fetch content when class or tab changes
  useEffect(() => {
    if (selectedClass) {
      fetchContent();
    }
  }, [selectedClass, fetchContent]);

  const handleContentView = (content) => {
    // Open content in new tab with right-click disabled
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${content.title} - DKJU Smart Class</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
              user-select: none;
              -webkit-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              border-bottom: 2px solid #0d9488;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .title {
              color: #0d9488;
              margin: 0;
              font-size: 24px;
            }
            .meta {
              color: #666;
              font-size: 14px;
              margin-top: 5px;
            }
            .description {
              margin: 15px 0;
              line-height: 1.6;
            }
            .content {
              text-align: center;
              margin: 20px 0;
            }
            .file-item {
              margin: 20px 0;
              padding: 15px;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              background: #f8fafc;
              text-align: left;
            }
            .file-item h3 {
              margin: 0 0 10px 0;
              font-size: 16px;
              color: #1e293b;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
              text-align: center;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 48px;
              color: rgba(13, 148, 136, 0.1);
              z-index: -1;
              pointer-events: none;
              font-weight: bold;
            }
            img {
              max-width: 100%;
              height: auto;
              border-radius: 4px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              user-drag: none;
              -webkit-user-drag: none;
            }
            iframe {
              width: 100%;
              height: 600px;
              border: none;
              border-radius: 4px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            @media print {
              body { display: none; }
            }
          </style>
        </head>
        <body oncontextmenu="return false;" ondragstart="return false;" onselectstart="return false;">
          <div class="watermark">DKJU Smart Class</div>
          <div class="container">
            <div class="header">
              <h1 class="title">${content.title}</h1>
              <div class="meta">
                Class: ${content.class} | Section: ${activeTab === 'syllabus' ? 'Syllabus' : 'Contents'}
                ${content.description ? ` | ${content.description}` : ''}
              </div>
            </div>
            <div class="content">
              ${content.files ? content.files.map(file => {
                if (file.type === 'image') {
                  return `<div class="file-item">
                    <h3>${file.originalName}</h3>
                    <img src="${file.url}" alt="${file.originalName}" />
                  </div>`;
                } else if (file.type === 'video') {
                  return `<div class="file-item">
                    <h3>${file.originalName}</h3>
                    <iframe src="${file.url}" title="${file.originalName}" frameborder="0" allowfullscreen></iframe>
                  </div>`;
                } else {
                  return `<div class="file-item">
                    <h3>${file.originalName}</h3>
                    <iframe src="${file.url}" title="${file.originalName}"></iframe>
                  </div>`;
                }
              }).join('') : 
              // Fallback for old single file format
              `${content.fileType === 'image' 
                ? `<img src="${content.fileUrl}" alt="${content.title}" />` 
                : content.fileType === 'video'
                ? `<iframe src="${content.fileUrl}" title="${content.title}" frameborder="0" allowfullscreen></iframe>`
                : `<iframe src="${content.fileUrl}" title="${content.title}"></iframe>`
              }`}
            </div>
          </div>
          <script>
            // Disable keyboard shortcuts
            document.addEventListener('keydown', function(e) {
              // Disable Ctrl+S, Ctrl+P, Ctrl+A, Ctrl+C, F12, etc.
              if (e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'a' || e.key === 'c')) {
                e.preventDefault();
                return false;
              }
              if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                e.preventDefault();
                return false;
              }
            });
            
            // Disable right-click
            document.addEventListener('contextmenu', function(e) {
              e.preventDefault();
              return false;
            });
          </script>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  const getCurrentContent = () => {
    return activeTab === 'syllabus' ? syllabusContent : studyContent;
  };

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Smart Class</h1>
          <p className="text-sm md:text-base text-gray-600">Access Madrasa syllabus and teaching materials</p>
        </div>

        {/* Class Selection */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-teal-600" />
              Select Class
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {CLASS_LEVELS.map((classLevel) => (
                <Button
                  key={classLevel}
                  variant={selectedClass === classLevel.replace('Class ', '') ? "default" : "outline"}
                  onClick={() => setSelectedClass(classLevel.replace('Class ', ''))}
                  className="min-h-[44px] text-sm md:text-base"
                >
                  {classLevel}
                </Button>
              ))}
            </div>
            {userData?.classLevel && (
              <p className="text-xs text-gray-500 mt-3">
                Your assigned class: <Badge variant="secondary">{userData.classLevel}</Badge>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Content Tabs */}
        {selectedClass && (
          <Card>
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-lg md:text-xl">
                  {selectedClass} Content
                </CardTitle>
                <div className="flex gap-2">
                     <Button
                    variant={activeTab === 'all' ? "default" : "outline"}
                    onClick={() => setActiveTab('all')}
                    className="flex items-center gap-2 min-h-[44px] text-sm md:text-base"
                  >
                    <Book className="h-4 w-4" />
                    All
                  </Button>
                  <Button
                    variant={activeTab === 'syllabus' ? "default" : "outline"}
                    onClick={() => setActiveTab('syllabus')}
                    className="flex items-center gap-2 min-h-[44px] text-sm md:text-base"
                  >
                    <Book className="h-4 w-4" />
                    Syllabus
                  </Button>
                  <Button
                    variant={activeTab === 'contents' ? "default" : "outline"}
                    onClick={() => setActiveTab('contents')}
                    className="flex items-center gap-2 min-h-[44px] text-sm md:text-base"
                  >
                    <BookOpen className="h-4 w-4" />
                    Contents
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {loading ? (
                <div className="text-center py-8 text-sm md:text-base">Loading content...</div>
              ) : getCurrentContent().length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm md:text-base">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No items available for this class yet.</p>
                  <p className="text-xs mt-2">Content will be added by the administration.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getCurrentContent().map((content) => (
                    <Card 
                      key={content.id} 
                      className="border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleContentView(content)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {content.files ? (
                              // Multiple files - show mixed icon
                              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-purple-600" />
                              </div>
                            ) : content.fileType === 'image' ? (
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-blue-600" />
                              </div>
                            ) : content.fileType === 'video' ? (
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <Video className="h-5 w-5 text-green-600" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-red-600" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-gray-900 truncate text-sm md:text-base">
                              {content.title}
                            </h3>
                            {content.description && (
                              <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2">
                                {content.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {content.files ? (
                                // Show multiple file type badges
                                content.files.map((file, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {file.type === 'image' ? 'Image' : file.type === 'video' ? 'Video' : 'PDF'}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  {content.fileType === 'image' ? 'Image' : content.fileType === 'video' ? 'Video' : 'PDF'}
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(content.createdAt?.seconds * 1000 || content.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
