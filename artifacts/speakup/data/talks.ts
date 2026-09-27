export type TalkSpeaker = "A" | "B";

export type TalkLine = {
  id: string;
  speaker: TalkSpeaker;
  english: string;
  hindi: string;
  vocabulary?: {
    word: string;
    meaning: string;
  }[];
  pronunciationFocus?: string;
};

export type TalkPractice = {
  prompt: string;
  expectedAnswer?: string;
  hindiPrompt?: string;
};

export type Talk = {
  id: string;
  title: string;
  category:
    | "job-interview"
    | "teacher"
    | "workplace"
    | "college"
    | "daily";
  level: "Beginner" | "Intermediate" | "Advanced";
  minutes: number;
  description: string;
  goal: string;
  lines: TalkLine[];
  practice?: TalkPractice[];
};

export const TALKS: Talk[] = [
  // =========================================================
  // JOB INTERVIEW
  // =========================================================

  {
    id: "job-self-introduction",
    title: "Tell Me About Yourself",
    category: "job-interview",
    level: "Beginner",
    minutes: 8,
    description: "Learn how to introduce yourself confidently in a job interview.",
    goal: "Give a clear and professional self-introduction.",
    lines: [
      {
        id: "ji-1",
        speaker: "A",
        english: "Good morning. Please introduce yourself.",
        hindi: "सुप्रभात। कृपया अपने बारे में बताइए।",
        pronunciationFocus: "introduce yourself",
      },
      {
        id: "ji-2",
        speaker: "B",
        english: "Good morning, sir. My name is Rajendra.",
        hindi: "सुप्रभात सर। मेरा नाम राजेंद्र है।",
        pronunciationFocus: "My name is",
      },
      {
        id: "ji-3",
        speaker: "B",
        english: "I am a mechanical engineer.",
        hindi: "मैं एक मैकेनिकल इंजीनियर हूँ।",
        pronunciationFocus: "mechanical engineer",
      },
      {
        id: "ji-4",
        speaker: "B",
        english: "I completed my bachelor's degree in mechanical engineering.",
        hindi: "मैंने मैकेनिकल इंजीनियरिंग में अपनी स्नातक डिग्री पूरी की है।",
        vocabulary: [
          { word: "completed", meaning: "पूरा किया" },
          { word: "bachelor's degree", meaning: "स्नातक डिग्री" },
        ],
      },
      {
        id: "ji-5",
        speaker: "B",
        english: "I have experience in technical and software-related work.",
        hindi: "मुझे तकनीकी और सॉफ्टवेयर से संबंधित काम का अनुभव है।",
        vocabulary: [
          { word: "experience", meaning: "अनुभव" },
          { word: "technical", meaning: "तकनीकी" },
        ],
      },
      {
        id: "ji-6",
        speaker: "B",
        english: "I am a quick learner and I enjoy solving problems.",
        hindi: "मैं जल्दी सीखता हूँ और मुझे समस्याएँ हल करना पसंद है।",
        pronunciationFocus: "quick learner",
      },
      {
        id: "ji-7",
        speaker: "A",
        english: "Thank you. Please tell me about your strengths.",
        hindi: "धन्यवाद। अपनी खूबियों के बारे में बताइए।",
      },
      {
        id: "ji-8",
        speaker: "B",
        english: "My strengths are problem-solving, learning quickly, and working responsibly.",
        hindi: "मेरी खूबियाँ समस्या-समाधान, जल्दी सीखना और जिम्मेदारी से काम करना हैं।",
      },
    ],
    practice: [
      {
        prompt: "Introduce yourself as if you are sitting in a real job interview.",
        hindiPrompt: "मान लीजिए आप वास्तविक job interview में हैं। अपना परिचय दीजिए।",
      },
      {
        prompt: "Tell the interviewer about your education.",
        hindiPrompt: "इंटरव्यू लेने वाले को अपनी शिक्षा के बारे में बताइए।",
      },
      {
        prompt: "Tell the interviewer about your strengths.",
        hindiPrompt: "अपनी खूबियों के बारे में बताइए।",
      },
    ],
  },

  {
    id: "job-education",
    title: "Talking About Your Education",
    category: "job-interview",
    level: "Beginner",
    minutes: 7,
    description: "Explain your educational background clearly and naturally.",
    goal: "Describe your qualification without memorising complicated sentences.",
    lines: [
      {
        id: "je-1",
        speaker: "A",
        english: "Can you tell me about your educational background?",
        hindi: "क्या आप अपनी शैक्षणिक पृष्ठभूमि के बारे में बता सकते हैं?",
      },
      {
        id: "je-2",
        speaker: "B",
        english: "I completed my diploma in mechanical engineering.",
        hindi: "मैंने मैकेनिकल इंजीनियरिंग में अपना डिप्लोमा पूरा किया है।",
      },
      {
        id: "je-3",
        speaker: "B",
        english: "After that, I completed my bachelor's degree in mechanical engineering.",
        hindi: "उसके बाद मैंने मैकेनिकल इंजीनियरिंग में अपनी स्नातक डिग्री पूरी की।",
      },
      {
        id: "je-4",
        speaker: "A",
        english: "What did you enjoy most during your studies?",
        hindi: "पढ़ाई के दौरान आपको सबसे ज्यादा क्या पसंद था?",
      },
      {
        id: "je-5",
        speaker: "B",
        english: "I enjoyed practical work and learning how machines and manufacturing processes work.",
        hindi: "मुझे practical work और machines तथा manufacturing processes को समझना पसंद था।",
      },
      {
        id: "je-6",
        speaker: "A",
        english: "How will your education help you in this job?",
        hindi: "आपकी शिक्षा इस नौकरी में आपकी कैसे मदद करेगी?",
      },
      {
        id: "je-7",
        speaker: "B",
        english: "My education has given me technical knowledge and problem-solving skills.",
        hindi: "मेरी शिक्षा ने मुझे तकनीकी ज्ञान और समस्या-समाधान की क्षमता दी है।",
      },
    ],
    practice: [
      {
        prompt: "Tell the interviewer about your highest qualification.",
        hindiPrompt: "इंटरव्यू में अपनी सबसे ऊँची qualification के बारे में बताइए।",
      },
      {
        prompt: "Explain how your education is useful for the job.",
        hindiPrompt: "बताइए कि आपकी पढ़ाई इस नौकरी के लिए कैसे उपयोगी है।",
      },
    ],
  },

  {
    id: "job-experience",
    title: "Talking About Work Experience",
    category: "job-interview",
    level: "Intermediate",
    minutes: 8,
    description: "Talk about your previous work and responsibilities.",
    goal: "Explain your experience confidently using simple English.",
    lines: [
      {
        id: "jx-1",
        speaker: "A",
        english: "Do you have any previous work experience?",
        hindi: "क्या आपके पास पहले का कोई work experience है?",
      },
      {
        id: "jx-2",
        speaker: "B",
        english: "Yes, I have experience working on technical projects.",
        hindi: "हाँ, मुझे technical projects पर काम करने का अनुभव है।",
      },
      {
        id: "jx-3",
        speaker: "A",
        english: "What were your main responsibilities?",
        hindi: "आपकी मुख्य जिम्मेदारियाँ क्या थीं?",
      },
      {
        id: "jx-4",
        speaker: "B",
        english: "My responsibilities included operating equipment, maintaining records, and supporting technical work.",
        hindi: "मेरी जिम्मेदारियों में equipment चलाना, records maintain करना और technical work में सहायता करना शामिल था।",
      },
      {
        id: "jx-5",
        speaker: "A",
        english: "What did you learn from that experience?",
        hindi: "आपने उस अनुभव से क्या सीखा?",
      },
      {
        id: "jx-6",
        speaker: "B",
        english: "I learned how to work under pressure, communicate with a team, and solve practical problems.",
        hindi: "मैंने pressure में काम करना, team के साथ communicate करना और practical problems solve करना सीखा।",
      },
    ],
    practice: [
      {
        prompt: "Describe your previous work experience.",
        hindiPrompt: "अपने पिछले work experience के बारे में बताइए।",
      },
      {
        prompt: "Explain your main responsibilities.",
        hindiPrompt: "अपनी मुख्य responsibilities समझाइए।",
      },
    ],
  },

  {
    id: "job-strengths-weaknesses",
    title: "Strengths and Weaknesses",
    category: "job-interview",
    level: "Intermediate",
    minutes: 8,
    description: "Answer one of the most common HR interview questions.",
    goal: "Talk about strengths and weaknesses honestly and professionally.",
    lines: [
      {
        id: "js-1",
        speaker: "A",
        english: "What are your biggest strengths?",
        hindi: "आपकी सबसे बड़ी खूबियाँ क्या हैं?",
      },
      {
        id: "js-2",
        speaker: "B",
        english: "I am a responsible person and I learn new things quickly.",
        hindi: "मैं एक जिम्मेदार व्यक्ति हूँ और नई चीजें जल्दी सीखता हूँ।",
      },
      {
        id: "js-3",
        speaker: "B",
        english: "I also enjoy solving technical problems.",
        hindi: "मुझे technical problems solve करना भी पसंद है।",
      },
      {
        id: "js-4",
        speaker: "A",
        english: "What is one area you want to improve?",
        hindi: "ऐसा कौन सा क्षेत्र है जिसमें आप सुधार करना चाहते हैं?",
      },
      {
        id: "js-5",
        speaker: "B",
        english: "I sometimes spend too much time checking my work.",
        hindi: "कभी-कभी मैं अपने काम को check करने में बहुत ज्यादा समय लगा देता हूँ।",
      },
      {
        id: "js-6",
        speaker: "B",
        english: "I am learning to manage my time better while maintaining quality.",
        hindi: "मैं quality बनाए रखते हुए अपने समय को बेहतर तरीके से manage करना सीख रहा हूँ।",
      },
    ],
    practice: [
      {
        prompt: "Tell the interviewer two of your strengths.",
        hindiPrompt: "इंटरव्यू लेने वाले को अपनी दो खूबियाँ बताइए।",
      },
      {
        prompt: "Describe one area you are currently improving.",
        hindiPrompt: "एक ऐसी चीज बताइए जिसमें आप अभी सुधार कर रहे हैं।",
      },
    ],
  },

  {
    id: "job-why-hire",
    title: "Why Should We Hire You?",
    category: "job-interview",
    level: "Intermediate",
    minutes: 7,
    description: "Learn how to explain the value you can bring to a company.",
    goal: "Give a confident answer without sounding overconfident.",
    lines: [
      {
        id: "jwh-1",
        speaker: "A",
        english: "Why should we hire you?",
        hindi: "हमें आपको नौकरी पर क्यों रखना चाहिए?",
      },
      {
        id: "jwh-2",
        speaker: "B",
        english: "I believe I can contribute through my technical knowledge and willingness to learn.",
        hindi: "मुझे लगता है कि मैं अपने technical knowledge और सीखने की इच्छा से योगदान दे सकता हूँ।",
      },
      {
        id: "jwh-3",
        speaker: "B",
        english: "I am comfortable working with a team and taking responsibility for my work.",
        hindi: "मैं team के साथ काम करने और अपने काम की जिम्मेदारी लेने में सहज हूँ।",
      },
      {
        id: "jwh-4",
        speaker: "B",
        english: "I am also willing to learn the skills required for this position.",
        hindi: "मैं इस position के लिए जरूरी skills सीखने के लिए भी तैयार हूँ।",
      },
      {
        id: "jwh-5",
        speaker: "A",
        english: "What can you bring to our team?",
        hindi: "आप हमारी team में क्या योगदान दे सकते हैं?",
      },
      {
        id: "jwh-6",
        speaker: "B",
        english: "I can bring a positive attitude, technical thinking, and a strong willingness to learn.",
        hindi: "मैं positive attitude, technical thinking और सीखने की मजबूत इच्छा ला सकता हूँ।",
      },
    ],
    practice: [
      {
        prompt: "Answer: Why should we hire you?",
        hindiPrompt: "जवाब दीजिए: हमें आपको नौकरी पर क्यों रखना चाहिए?",
      },
    ],
  },

  {
    id: "job-career-goals",
    title: "Career Goals",
    category: "job-interview",
    level: "Intermediate",
    minutes: 7,
    description: "Talk about your short-term and long-term career goals.",
    goal: "Explain your future plans clearly.",
    lines: [
      {
        id: "jcg-1",
        speaker: "A",
        english: "Where do you see yourself in five years?",
        hindi: "आप खुद को पाँच साल बाद कहाँ देखते हैं?",
      },
      {
        id: "jcg-2",
        speaker: "B",
        english: "I want to become a skilled professional in my field.",
        hindi: "मैं अपने क्षेत्र में एक कुशल professional बनना चाहता हूँ।",
      },
      {
        id: "jcg-3",
        speaker: "B",
        english: "I want to take on more responsibility as I gain experience.",
        hindi: "अनुभव बढ़ने के साथ मैं अधिक जिम्मेदारी लेना चाहता हूँ।",
      },
      {
        id: "jcg-4",
        speaker: "A",
        english: "What are your short-term goals?",
        hindi: "आपके short-term goals क्या हैं?",
      },
      {
        id: "jcg-5",
        speaker: "B",
        english: "My short-term goal is to improve my technical and communication skills.",
        hindi: "मेरा short-term goal अपनी technical और communication skills को बेहतर करना है।",
      },
    ],
    practice: [
      {
        prompt: "Tell the interviewer about your five-year goal.",
        hindiPrompt: "अपने पाँच साल के goal के बारे में बताइए।",
      },
    ],
  },

  // =========================================================
  // TEACHER & CLASSROOM
  // =========================================================

  {
    id: "teacher-introduction",
    title: "Introducing Yourself to Students",
    category: "teacher",
    level: "Beginner",
    minutes: 7,
    description: "Learn how a teacher can introduce themselves naturally.",
    goal: "Start a class confidently in English.",
    lines: [
      {
        id: "ti-1",
        speaker: "A",
        english: "Good morning, everyone.",
        hindi: "सुप्रभात, सभी को।",
      },
      {
        id: "ti-2",
        speaker: "A",
        english: "My name is Mr. Rajendra, and I will be your teacher for this subject.",
        hindi: "मेरा नाम श्री राजेंद्र है और मैं इस विषय के लिए आपका शिक्षक रहूँगा।",
      },
      {
        id: "ti-3",
        speaker: "A",
        english: "I am happy to be here with you.",
        hindi: "मुझे आपके साथ यहाँ आकर खुशी हो रही है।",
      },
      {
        id: "ti-4",
        speaker: "A",
        english: "Before we begin, I would like to know a little about you.",
        hindi: "शुरू करने से पहले मैं आपके बारे में थोड़ा जानना चाहता हूँ।",
      },
      {
        id: "ti-5",
        speaker: "A",
        english: "Please introduce yourself one by one.",
        hindi: "कृपया एक-एक करके अपना परिचय दीजिए।",
      },
      {
        id: "ti-6",
        speaker: "B",
        english: "Good morning, sir. My name is Aman.",
        hindi: "सुप्रभात सर। मेरा नाम अमन है।",
      },
      {
        id: "ti-7",
        speaker: "A",
        english: "Thank you, Aman. Please take your seat.",
        hindi: "धन्यवाद अमन। कृपया अपनी जगह पर बैठ जाइए।",
      },
    ],
    practice: [
      {
        prompt: "Introduce yourself as a teacher on the first day of class.",
        hindiPrompt: "पहले दिन teacher की तरह अपना परिचय दीजिए।",
      },
    ],
  },

  {
    id: "teacher-start-class",
    title: "Starting the Class",
    category: "teacher",
    level: "Beginner",
    minutes: 7,
    description: "Useful English expressions for starting a classroom session.",
    goal: "Start your class naturally and professionally.",
    lines: [
      {
        id: "tsc-1",
        speaker: "A",
        english: "Good morning, everyone. Are you ready for today's class?",
        hindi: "सुप्रभात, सभी को। क्या आप आज की class के लिए तैयार हैं?",
      },
      {
        id: "tsc-2",
        speaker: "B",
        english: "Yes, sir.",
        hindi: "जी सर।",
      },
      {
        id: "tsc-3",
        speaker: "A",
        english: "Today we are going to learn about the basic principles of this topic.",
        hindi: "आज हम इस topic के basic principles के बारे में सीखेंगे।",
      },
      {
        id: "tsc-4",
        speaker: "A",
        english: "Please keep your notebooks ready.",
        hindi: "कृपया अपनी notebooks तैयार रखें।",
      },
      {
        id: "tsc-5",
        speaker: "A",
        english: "If you have any questions, please feel free to ask.",
        hindi: "अगर आपके कोई questions हैं तो बेझिझक पूछिए।",
      },
      {
        id: "tsc-6",
        speaker: "A",
        english: "Let's begin.",
        hindi: "चलिए शुरू करते हैं।",
      },
    ],
    practice: [
      {
        prompt: "Start a class and tell students what they will learn today.",
        hindiPrompt: "एक class शुरू कीजिए और students को बताइए कि आज वे क्या सीखेंगे।",
      },
    ],
  },

  {
    id: "teacher-attendance",
    title: "Taking Attendance",
    category: "teacher",
    level: "Beginner",
    minutes: 6,
    description: "Common classroom English for attendance.",
    goal: "Take attendance confidently in English.",
    lines: [
      {
        id: "ta-1",
        speaker: "A",
        english: "Let's take attendance first.",
        hindi: "पहले attendance लेते हैं।",
      },
      {
        id: "ta-2",
        speaker: "A",
        english: "Is Aman present today?",
        hindi: "क्या अमन आज present है?",
      },
      {
        id: "ta-3",
        speaker: "B",
        english: "Yes, sir. He is present.",
        hindi: "जी सर। वह present है।",
      },
      {
        id: "ta-4",
        speaker: "A",
        english: "Is everyone present?",
        hindi: "क्या सभी present हैं?",
      },
      {
        id: "ta-5",
        speaker: "B",
        english: "No, sir. Rahul is absent today.",
        hindi: "नहीं सर। राहुल आज absent है।",
      },
      {
        id: "ta-6",
        speaker: "A",
        english: "Okay. Please mark him absent.",
        hindi: "ठीक है। उसे absent mark कर दीजिए।",
      },
    ],
    practice: [
      {
        prompt: "Take attendance as if you are teaching a real class.",
        hindiPrompt: "मान लीजिए आप real class ले रहे हैं। attendance लीजिए।",
      },
    ],
  },

  {
    id: "teacher-explain-topic",
    title: "Explaining a Topic",
    category: "teacher",
    level: "Intermediate",
    minutes: 9,
    description: "Learn useful phrases for explaining technical or academic topics.",
    goal: "Explain concepts clearly using simple classroom English.",
    lines: [
      {
        id: "tet-1",
        speaker: "A",
        english: "Let us understand this concept step by step.",
        hindi: "आइए इस concept को step by step समझते हैं।",
      },
      {
        id: "tet-2",
        speaker: "A",
        english: "First, let us look at the basic definition.",
        hindi: "पहले basic definition देखते हैं।",
      },
      {
        id: "tet-3",
        speaker: "A",
        english: "In simple words, this means that the material changes its shape when force is applied.",
        hindi: "सरल शब्दों में इसका मतलब है कि force लगाने पर material अपना shape बदलता है।",
      },
      {
        id: "tet-4",
        speaker: "A",
        english: "Let me give you a simple example.",
        hindi: "मैं आपको एक simple example देता हूँ।",
      },
      {
        id: "tet-5",
        speaker: "A",
        english: "Please pay attention to this part because it is important.",
        hindi: "कृपया इस part पर ध्यान दें क्योंकि यह important है।",
      },
      {
        id: "tet-6",
        speaker: "B",
        english: "Sir, could you explain that part again?",
        hindi: "सर, क्या आप उस part को फिर से समझा सकते हैं?",
      },
      {
        id: "tet-7",
        speaker: "A",
        english: "Of course. I will explain it again with another example.",
        hindi: "बिल्कुल। मैं इसे एक और example के साथ फिर से समझाता हूँ।",
      },
    ],
    practice: [
      {
        prompt: "Explain any topic you know in simple English.",
        hindiPrompt: "आपको जो कोई topic आता है, उसे simple English में समझाइए।",
      },
    ],
  },

  {
    id: "teacher-ask-questions",
    title: "Asking Students Questions",
    category: "teacher",
    level: "Beginner",
    minutes: 7,
    description: "Learn how to ask students questions and encourage answers.",
    goal: "Make your classroom more interactive.",
    lines: [
      {
        id: "tq-1",
        speaker: "A",
        english: "Can anyone answer this question?",
        hindi: "क्या कोई इस question का answer दे सकता है?",
      },
      {
        id: "tq-2",
        speaker: "B",
        english: "Sir, I would like to answer.",
        hindi: "सर, मैं answer देना चाहता हूँ।",
      },
      {
        id: "tq-3",
        speaker: "A",
        english: "Yes, please go ahead.",
        hindi: "हाँ, बताइए।",
      },
      {
        id: "tq-4",
        speaker: "B",
        english: "I think the answer is twenty-five.",
        hindi: "मुझे लगता है answer twenty-five है।",
      },
      {
        id: "tq-5",
        speaker: "A",
        english: "Good attempt. Can anyone explain why?",
        hindi: "अच्छी कोशिश। क्या कोई बता सकता है कि क्यों?",
      },
      {
        id: "tq-6",
        speaker: "A",
        english: "There is no problem if you make a mistake. Just try.",
        hindi: "अगर आपसे mistake हो जाए तो कोई problem नहीं है। बस कोशिश कीजिए।",
      },
    ],
    practice: [
      {
        prompt: "Ask your students three questions about today's topic.",
        hindiPrompt: "आज के topic पर students से तीन questions पूछिए।",
      },
    ],
  },

  {
    id: "teacher-correct-mistakes",
    title: "Correcting Students Politely",
    category: "teacher",
    level: "Intermediate",
    minutes: 7,
    description: "Correct mistakes without discouraging students.",
    goal: "Use polite and encouraging classroom English.",
    lines: [
      {
        id: "tcp-1",
        speaker: "A",
        english: "That's a good attempt, but let's look at it once again.",
        hindi: "यह अच्छी कोशिश है, लेकिन एक बार फिर देखते हैं।",
      },
      {
        id: "tcp-2",
        speaker: "A",
        english: "There is a small mistake in your answer.",
        hindi: "आपके answer में एक छोटी mistake है।",
      },
      {
        id: "tcp-3",
        speaker: "B",
        english: "Could you please tell me where I went wrong?",
        hindi: "क्या आप बता सकते हैं कि मुझसे कहाँ गलती हुई?",
      },
      {
        id: "tcp-4",
        speaker: "A",
        english: "Sure. You need to use the past tense here.",
        hindi: "ज़रूर। यहाँ आपको past tense का उपयोग करना है।",
      },
      {
        id: "tcp-5",
        speaker: "A",
        english: "Now try the sentence again.",
        hindi: "अब sentence को फिर से बोलिए।",
      },
      {
        id: "tcp-6",
        speaker: "B",
        english: "I understand now. Thank you, sir.",
        hindi: "अब मुझे समझ आ गया। धन्यवाद सर।",
      },
    ],
    practice: [
      {
        prompt: "Politely correct a student who has made a mistake.",
        hindiPrompt: "किसी student की mistake को politely correct कीजिए।",
      },
    ],
  },

  {
    id: "teacher-student-doubt",
    title: "Handling Student Doubts",
    category: "teacher",
    level: "Intermediate",
    minutes: 8,
    description: "Learn how to respond when students ask questions.",
    goal: "Handle doubts naturally and confidently.",
    lines: [
      {
        id: "td-1",
        speaker: "B",
        english: "Sir, I have a doubt.",
        hindi: "सर, मेरा एक doubt है।",
      },
      {
        id: "td-2",
        speaker: "A",
        english: "Sure. What is your question?",
        hindi: "ज़रूर। आपका question क्या है?",
      },
      {
        id: "td-3",
        speaker: "B",
        english: "I did not understand this step.",
        hindi: "मुझे यह step समझ नहीं आया।",
      },
      {
        id: "td-4",
        speaker: "A",
        english: "No problem. Let me explain it again.",
        hindi: "कोई problem नहीं। मैं इसे फिर से समझाता हूँ।",
      },
      {
        id: "td-5",
        speaker: "A",
        english: "Please stop me if anything is unclear.",
        hindi: "अगर कुछ clear नहीं है तो मुझे रोक दीजिए।",
      },
      {
        id: "td-6",
        speaker: "B",
        english: "Thank you. Now I understand it.",
        hindi: "धन्यवाद। अब मुझे समझ आ गया।",
      },
    ],
    practice: [
      {
        prompt: "Respond to a student who says that they do not understand a topic.",
        hindiPrompt: "ऐसे student को जवाब दीजिए जो कहता है कि उसे topic समझ नहीं आया।",
      },
    ],
  },

  {
    id: "teacher-parent-meeting",
    title: "Parent–Teacher Conversation",
    category: "teacher",
    level: "Intermediate",
    minutes: 9,
    description: "Useful English for communicating with parents about a student.",
    goal: "Discuss student progress politely and professionally.",
    lines: [
      {
        id: "pt-1",
        speaker: "A",
        english: "Good afternoon. Thank you for coming.",
        hindi: "नमस्कार। आने के लिए धन्यवाद।",
      },
      {
        id: "pt-2",
        speaker: "B",
        english: "Thank you for meeting with me.",
        hindi: "मुझसे मिलने के लिए धन्यवाद।",
      },
      {
        id: "pt-3",
        speaker: "A",
        english: "Your child is doing well in class.",
        hindi: "आपका बच्चा class में अच्छा कर रहा है।",
      },
      {
        id: "pt-4",
        speaker: "A",
        english: "However, I would like him to participate more actively.",
        hindi: "हालाँकि, मैं चाहता हूँ कि वह थोड़ा और actively participate करे।",
      },
      {
        id: "pt-5",
        speaker: "B",
        english: "What can we do at home to support him?",
        hindi: "हम घर पर उसकी मदद करने के लिए क्या कर सकते हैं?",
      },
      {
        id: "pt-6",
        speaker: "A",
        english: "Please encourage him to read and speak English for a few minutes every day.",
        hindi: "कृपया उसे हर दिन कुछ मिनट English पढ़ने और बोलने के लिए encourage करें।",
      },
    ],
    practice: [
      {
        prompt: "Talk to a parent about a student's progress and one area for improvement.",
        hindiPrompt: "किसी parent से student की progress और improvement के एक area के बारे में बात कीजिए।",
      },
    ],
  },

  // =========================================================
  // WORKPLACE
  // =========================================================

  {
    id: "workplace-manager",
    title: "Talking to Your Manager",
    category: "workplace",
    level: "Intermediate",
    minutes: 7,
    description: "Useful English for professional communication with your manager.",
    goal: "Communicate clearly and politely at work.",
    lines: [
      {
        id: "wm-1",
        speaker: "A",
        english: "Do you have a minute?",
        hindi: "क्या आपके पास एक मिनट है?",
      },
      {
        id: "wm-2",
        speaker: "B",
        english: "Yes. How can I help you?",
        hindi: "हाँ। मैं आपकी कैसे मदद कर सकता हूँ?",
      },
      {
        id: "wm-3",
        speaker: "A",
        english: "I wanted to discuss the progress of my task.",
        hindi: "मैं अपने task की progress के बारे में बात करना चाहता था।",
      },
      {
        id: "wm-4",
        speaker: "B",
        english: "Sure. Please give me an update.",
        hindi: "ज़रूर। मुझे update दीजिए।",
      },
      {
        id: "wm-5",
        speaker: "A",
        english: "I have completed most of the work, but I need some clarification about the final step.",
        hindi: "मैंने ज्यादातर काम पूरा कर लिया है, लेकिन final step के बारे में मुझे थोड़ी clarification चाहिए।",
      },
    ],
    practice: [
      {
        prompt: "Give your manager an update about a task.",
        hindiPrompt: "अपने manager को किसी task का update दीजिए।",
      },
    ],
  },

  // =========================================================
  // COLLEGE / STUDENT
  // =========================================================

  {
    id: "college-asking-professor",
    title: "Talking to a Professor",
    category: "college",
    level: "Beginner",
    minutes: 7,
    description: "Learn polite English for talking to a professor.",
    goal: "Ask questions and requests respectfully.",
    lines: [
      {
        id: "cp-1",
        speaker: "B",
        english: "Excuse me, sir. May I ask you something?",
        hindi: "Excuse me सर। क्या मैं आपसे कुछ पूछ सकता हूँ?",
      },
      {
        id: "cp-2",
        speaker: "A",
        english: "Of course. What would you like to know?",
        hindi: "बिल्कुल। आप क्या जानना चाहते हैं?",
      },
      {
        id: "cp-3",
        speaker: "B",
        english: "Could you please explain the assignment requirements?",
        hindi: "क्या आप assignment की requirements समझा सकते हैं?",
      },
      {
        id: "cp-4",
        speaker: "A",
        english: "Sure. I will explain them after class.",
        hindi: "ज़रूर। मैं class के बाद समझा दूँगा।",
      },
    ],
    practice: [
      {
        prompt: "Ask your professor for clarification about an assignment.",
        hindiPrompt: "अपने professor से assignment के बारे में clarification माँगिए।",
      },
    ],
  },

  // =========================================================
  // DAILY
  // =========================================================

  {
    id: "daily-meeting-someone",
    title: "Meeting Someone New",
    category: "daily",
    level: "Beginner",
    minutes: 6,
    description: "Start a natural conversation when meeting someone for the first time.",
    goal: "Introduce yourself and keep a simple conversation going.",
    lines: [
      {
        id: "dm-1",
        speaker: "A",
        english: "Hi, my name is Aman. Nice to meet you.",
        hindi: "नमस्ते, मेरा नाम अमन है। आपसे मिलकर अच्छा लगा।",
      },
      {
        id: "dm-2",
        speaker: "B",
        english: "Nice to meet you too. My name is Raj.",
        hindi: "आपसे मिलकर मुझे भी अच्छा लगा। मेरा नाम राज है।",
      },
      {
        id: "dm-3",
        speaker: "A",
        english: "Where are you from?",
        hindi: "आप कहाँ से हैं?",
      },
      {
        id: "dm-4",
        speaker: "B",
        english: "I am from Ranchi. How about you?",
        hindi: "मैं रांची से हूँ। आप?",
      },
      {
        id: "dm-5",
        speaker: "A",
        english: "I am from Jamshedpur. What do you do?",
        hindi: "मैं जमशेदपुर से हूँ। आप क्या करते हैं?",
      },
      {
        id: "dm-6",
        speaker: "B",
        english: "I work as an engineer.",
        hindi: "मैं engineer के रूप में काम करता हूँ।",
      },
    ],
    practice: [
      {
        prompt: "Imagine you are meeting a new person. Introduce yourself and ask three questions.",
        hindiPrompt: "मान लीजिए आप किसी नए व्यक्ति से मिल रहे हैं। अपना परिचय दें और तीन questions पूछें।",
      },
    ],
  },
  {
    id: "job-salary-discussion",
    title: "Salary Discussion",
    category: "job-interview",
    level: "Intermediate",
    minutes: 7,
    description: "Learn polite and professional English for discussing salary.",
    goal: "Discuss salary expectations confidently and professionally.",
    lines: [
      {
        id: "jsd-1",
        speaker: "A",
        english: "What are your salary expectations?",
        hindi: "आपकी salary expectations क्या हैं?",
      },
      {
        id: "jsd-2",
        speaker: "B",
        english: "Based on my skills and experience, I am expecting a fair salary.",
        hindi: "अपनी skills और experience के आधार पर मैं उचित salary की उम्मीद कर रहा हूँ।",
      },
      {
        id: "jsd-3",
        speaker: "A",
        english: "Do you have a specific salary range in mind?",
        hindi: "क्या आपके मन में कोई specific salary range है?",
      },
      {
        id: "jsd-4",
        speaker: "B",
        english: "I am open to discussing the salary based on the responsibilities of the role.",
        hindi: "मैं role की responsibilities के आधार पर salary पर चर्चा करने के लिए तैयार हूँ।",
      },
      {
        id: "jsd-5",
        speaker: "A",
        english: "Are you flexible about the salary?",
        hindi: "क्या आप salary को लेकर flexible हैं?",
      },
      {
        id: "jsd-6",
        speaker: "B",
        english: "Yes, I am flexible and more interested in the right opportunity.",
        hindi: "हाँ, मैं flexible हूँ और सही opportunity में अधिक interested हूँ।",
      },
    ],
    practice: [
      {
        prompt: "Tell the interviewer about your salary expectations politely.",
        hindiPrompt: "Interviewer को अपनी salary expectations politely बताइए।",
      },
    ],
  },
  {
    id: "job-hr-questions",
    title: "Common HR Questions",
    category: "job-interview",
    level: "Intermediate",
    minutes: 8,
    description: "Practice common HR questions and natural English answers.",
    goal: "Answer HR questions clearly and confidently.",
    lines: [
      {
        id: "jhq-1",
        speaker: "A",
        english: "Why do you want to join our company?",
        hindi: "आप हमारी company join क्यों करना चाहते हैं?",
      },
      {
        id: "jhq-2",
        speaker: "B",
        english: "I believe this company will give me a good opportunity to learn and grow.",
        hindi: "मुझे लगता है कि यह company मुझे सीखने और आगे बढ़ने का अच्छा opportunity देगी।",
      },
      {
        id: "jhq-3",
        speaker: "A",
        english: "What motivates you at work?",
        hindi: "आपको काम में क्या motivate करता है?",
      },
      {
        id: "jhq-4",
        speaker: "B",
        english: "I am motivated by learning new things and solving problems.",
        hindi: "मैं नई चीजें सीखने और problems solve करने से motivated होता हूँ।",
      },
      {
        id: "jhq-5",
        speaker: "A",
        english: "How do you handle pressure?",
        hindi: "आप pressure को कैसे handle करते हैं?",
      },
      {
        id: "jhq-6",
        speaker: "B",
        english: "I stay calm, prioritize my work, and complete tasks step by step.",
        hindi: "मैं शांत रहता हूँ, अपने काम को priority देता हूँ और tasks को step by step पूरा करता हूँ।",
      },
    ],
    practice: [
      {
        prompt: "Answer three common HR interview questions in English.",
        hindiPrompt: "तीन common HR interview questions का English में answer दीजिए।",
      },
    ],
  },
  {
    id: "job-technical-interview",
    title: "Technical Interview",
    category: "job-interview",
    level: "Advanced",
    minutes: 9,
    description: "Practice explaining your technical knowledge and projects.",
    goal: "Explain technical concepts clearly during an interview.",
    lines: [
      {
        id: "jti-1",
        speaker: "A",
        english: "Can you explain one of your technical projects?",
        hindi: "क्या आप अपने किसी technical project के बारे में बता सकते हैं?",
      },
      {
        id: "jti-2",
        speaker: "B",
        english: "Yes. I worked on a project where I designed and tested a practical solution.",
        hindi: "हाँ। मैंने एक project पर काम किया जिसमें मैंने एक practical solution design और test किया।",
      },
      {
        id: "jti-3",
        speaker: "A",
        english: "What was the biggest challenge in the project?",
        hindi: "Project में सबसे बड़ी challenge क्या थी?",
      },
      {
        id: "jti-4",
        speaker: "B",
        english: "The biggest challenge was solving technical problems while meeting the deadline.",
        hindi: "सबसे बड़ी challenge deadline के अंदर technical problems को solve करना था।",
      },
      {
        id: "jti-5",
        speaker: "A",
        english: "How did you test your solution?",
        hindi: "आपने अपने solution को कैसे test किया?",
      },
      {
        id: "jti-6",
        speaker: "B",
        english: "I tested it step by step and improved it based on the results.",
        hindi: "मैंने इसे step by step test किया और results के आधार पर improve किया।",
      },
    ],
    practice: [
      {
        prompt: "Explain one technical project you have worked on.",
        hindiPrompt: "अपने किसी technical project को English में explain कीजिए।",
      },
    ],
  },
  {
    id: "job-interview-closing",
    title: "Interview Closing",
    category: "job-interview",
    level: "Beginner",
    minutes: 6,
    description: "Practice ending an interview politely and professionally.",
    goal: "Close an interview confidently and ask appropriate questions.",
    lines: [
      {
        id: "jic-1",
        speaker: "A",
        english: "Do you have any questions for us?",
        hindi: "क्या आपके पास हमारे लिए कोई questions हैं?",
      },
      {
        id: "jic-2",
        speaker: "B",
        english: "Yes. Could you tell me more about the role and the team?",
        hindi: "हाँ। क्या आप मुझे role और team के बारे में थोड़ा और बता सकते हैं?",
      },
      {
        id: "jic-3",
        speaker: "A",
        english: "Is there anything else you would like to know?",
        hindi: "क्या आप और कुछ जानना चाहते हैं?",
      },
      {
        id: "jic-4",
        speaker: "B",
        english: "No, thank you. I appreciate your time.",
        hindi: "नहीं, धन्यवाद। मैं आपके समय की सराहना करता हूँ।",
      },
      {
        id: "jic-5",
        speaker: "A",
        english: "Thank you for attending the interview.",
        hindi: "Interview में शामिल होने के लिए धन्यवाद।",
      },
      {
        id: "jic-6",
        speaker: "B",
        english: "Thank you for the opportunity. I look forward to hearing from you.",
        hindi: "इस opportunity के लिए धन्यवाद। मुझे आपके जवाब का इंतजार रहेगा।",
      },
    ],
    practice: [
      {
        prompt: "End an interview politely and thank the interviewer.",
        hindiPrompt: "Interview को politely end करें और interviewer को thank करें।",
      },
    ],
  },
  {
    id: "teacher-homework",
    title: "Giving Homework",
    category: "teacher",
    level: "Beginner",
    minutes: 5,
    description: "Learn useful English for giving homework and explaining deadlines.",
    goal: "Give clear homework instructions to students.",
    lines: [
      {
        id: "thw-1",
        speaker: "A",
        english: "For homework, complete questions one to five.",
        hindi: "Homework में questions one से five तक complete करें।",
      },
      {
        id: "thw-2",
        speaker: "B",
        english: "When should we submit the homework?",
        hindi: "हमें homework कब submit करना है?",
      },
      {
        id: "thw-3",
        speaker: "A",
        english: "Please submit it by tomorrow morning.",
        hindi: "कृपया इसे कल सुबह तक submit करें।",
      },
      {
        id: "thw-4",
        speaker: "B",
        english: "Can we work in pairs?",
        hindi: "क्या हम pairs में काम कर सकते हैं?",
      },
      {
        id: "thw-5",
        speaker: "A",
        english: "Yes, but each student must complete the written work.",
        hindi: "हाँ, लेकिन हर student को written work पूरा करना होगा।",
      },
      {
        id: "thw-6",
        speaker: "B",
        english: "Okay, thank you, teacher.",
        hindi: "ठीक है, धन्यवाद teacher।",
      },
    ],
    practice: [
      {
        prompt: "Give homework instructions to your students in English.",
        hindiPrompt: "अपने students को English में homework instructions दीजिए।",
      },
    ],
  },
];

export const TALK_CATEGORIES = [
  {
    id: "job-interview",
    title: "Job Interview",
    description: "Speak confidently in interviews.",
  },
  {
    id: "teacher",
    title: "Teacher & Classroom",
    description: "Useful English for teachers and classrooms.",
  },
  {
    id: "workplace",
    title: "Workplace",
    description: "Communicate professionally at work.",
  },
  {
    id: "college",
    title: "College & Student",
    description: "Speak naturally in academic situations.",
  },
  {
    id: "daily",
    title: "Daily Situations",
    description: "Handle common everyday conversations.",
  },
] as const;


