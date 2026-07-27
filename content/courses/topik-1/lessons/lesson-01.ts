import { defineLesson } from "@/content/schema";

const vocabularySource = [
  ["한국", "Hàn Quốc", "Quốc gia", "han-guk"],
  ["베트남", "Việt Nam", "Quốc gia", "be-teu-nam"],
  ["말레이시아", "Malaysia", "Quốc gia", "mal-le-i-si-a"],
  ["일본", "Nhật Bản", "Quốc gia", "il-bon"],
  ["미국", "Mỹ", "Quốc gia", "mi-guk"],
  ["중국", "Trung Quốc", "Quốc gia", "jung-guk"],
  ["태국", "Thái Lan", "Quốc gia", "tae-guk"],
  ["호주", "Úc", "Quốc gia", "ho-ju"],
  ["몽골", "Mông Cổ", "Quốc gia", "mong-gol"],
  ["인도네시아", "Indonesia", "Quốc gia", "in-do-ne-si-a"],
  ["필리핀", "Philippines", "Quốc gia", "pil-li-pin"],
  ["인도", "Ấn Độ", "Quốc gia", "in-do"],
  ["영국", "Anh", "Quốc gia", "yeong-guk"],
  ["독일", "Đức", "Quốc gia", "do-gil"],
  ["프랑스", "Pháp", "Quốc gia", "peu-rang-seu"],
  ["러시아", "Nga", "Quốc gia", "reo-si-a"],
  ["학생", "học sinh", "Nghề nghiệp", "hak-saeng"],
  ["회사원", "nhân viên công ty", "Nghề nghiệp", "hoe-sa-won"],
  ["은행원", "nhân viên ngân hàng", "Nghề nghiệp", "eun-haeng-won"],
  ["교사", "giáo viên", "Nghề nghiệp", "gyo-sa"],
  ["의사", "bác sĩ", "Nghề nghiệp", "ui-sa"],
  ["공무원", "công chức", "Nghề nghiệp", "gong-mu-won"],
  ["관광 가이드", "hướng dẫn viên du lịch", "Nghề nghiệp", "gwan-gwang ga-i-deu"],
  ["주부", "nội trợ", "Nghề nghiệp", "ju-bu"],
  ["약사", "dược sĩ", "Nghề nghiệp", "yak-sa"],
  ["운전기사", "tài xế", "Nghề nghiệp", "un-jeon-gi-sa"],
  ["안녕하세요?", "Xin chào", "Lời chào", "an-nyeong-ha-se-yo?"],
  ["안녕히 가세요.", "Tạm biệt người rời đi", "Lời chào", "an-nyeong-hi ga-se-yo"],
  ["안녕히 계세요.", "Tạm biệt người ở lại", "Lời chào", "an-nyeong-hi gye-se-yo"],
  ["처음 뵙겠습니다.", "Lần đầu được gặp", "Lời chào", "cheo-eum boep-get-seum-ni-da"],
  ["반갑습니다.", "Rất vui được gặp", "Lời chào", "ban-gap-seum-ni-da"],
  ["국어국문학과", "khoa ngữ văn", "Từ mới", "gu-geo-gung-mun-hak-gwa"],
  ["국적", "quốc tịch", "Từ mới", "guk-jeok"],
  ["네", "vâng", "Từ mới", "ne"],
  ["대학교", "trường đại học", "Từ mới", "dae-hak-gyo"],
  ["대학생", "sinh viên", "Từ mới", "dae-hak-saeng"],
  ["분", "vị, người (kính ngữ)", "Từ mới", "bun"],
  ["보기", "mẫu, ví dụ", "Từ mới", "bo-gi"],
  ["사람", "người", "Từ mới", "sa-ram"],
  ["씨", "bạn / anh / chị", "Từ mới", "ssi"],
  ["아니요", "không", "Từ mới", "a-ni-yo"],
  ["은행", "ngân hàng", "Từ mới", "eun-haeng"],
  ["이", "này", "Từ mới", "i"],
  ["이름", "tên", "Từ mới", "i-reum"],
  ["이메일", "email", "Từ mới", "i-me-il"],
  ["저", "tôi (khiêm nhường)", "Từ mới", "jeo"],
  ["전화", "điện thoại", "Từ mới", "jeon-hwa"],
  ["제", "của tôi", "Từ mới", "je"],
  ["주소", "địa chỉ", "Từ mới", "ju-so"],
  ["직업", "nghề nghiệp", "Từ mới", "ji-geop"],
  ["학과", "khoa / bộ môn", "Từ mới", "hak-gwa"],
  ["학번", "mã số sinh viên", "Từ mới", "hak-beon"],
  ["학생증", "thẻ sinh viên", "Từ mới", "hak-saeng-jjeung"],
  ["한국어", "tiếng Hàn", "Từ mới", "han-gu-geo"],
  ["한국어과", "khoa tiếng Hàn", "Từ mới", "han-gu-geo-gwa"],
] as const;

const specificExamples: Record<string, readonly [string, string]> = {
  "안녕하세요?": ["선생님, 안녕하세요?", "Em chào thầy/cô ạ!"],
  "안녕히 가세요.": ["오늘 만나서 반가웠어요. 안녕히 가세요.", "Hôm nay rất vui được gặp bạn. Bạn về bình an nhé."],
  "안녕히 계세요.": ["저는 먼저 가겠습니다. 안녕히 계세요.", "Tôi xin phép về trước. Mọi người ở lại bình an nhé."],
  "처음 뵙겠습니다.": ["처음 뵙겠습니다. 저는 민수입니다.", "Rất vui được gặp bạn lần đầu. Tôi là Minsu."],
  "반갑습니다.": ["만나서 정말 반갑습니다.", "Tôi thực sự rất vui được gặp bạn."],
  국어국문학과: ["제 언니는 국어국문학과에 다녀요.", "Chị tôi học khoa Ngữ văn Hàn Quốc."],
  국적: ["신청서에 국적을 써 주세요.", "Hãy ghi quốc tịch vào đơn đăng ký."],
  네: ["네, 내일 아침에 만나요.", "Vâng, sáng mai chúng ta gặp nhau nhé."],
  대학교: ["우리 대학교는 도서관이 아주 커요.", "Thư viện trường đại học của chúng tôi rất lớn."],
  대학생: ["저는 올해 스무 살 대학생이에요.", "Năm nay tôi là sinh viên hai mươi tuổi."],
  분: ["저기 서 있는 분은 제 선생님이에요.", "Vị đang đứng đằng kia là giáo viên của tôi."],
  보기: ["보기를 읽고 알맞은 답을 고르세요.", "Hãy đọc ví dụ rồi chọn đáp án phù hợp."],
  사람: ["그 사람은 마음이 참 따뜻해요.", "Người đó có tấm lòng rất ấm áp."],
  씨: ["지민 씨, 지금 시간 괜찮아요?", "Bạn Jimin, bây giờ bạn có rảnh không?"],
  아니요: ["아니요, 저는 커피를 마시지 않아요.", "Không, tôi không uống cà phê."],
  은행: ["점심시간에 은행에 다녀왔어요.", "Tôi đã đến ngân hàng vào giờ nghỉ trưa."],
  이: ["이 책은 한국어 공부에 도움이 돼요.", "Cuốn sách này giúp ích cho việc học tiếng Hàn."],
  이름: ["제 이름은 응우옌 민입니다.", "Tên tôi là Nguyễn Minh."],
  이메일: ["자료를 이메일로 보내 드릴게요.", "Tôi sẽ gửi tài liệu cho bạn qua email."],
  저: ["저는 매일 한국어를 연습해요.", "Tôi luyện tập tiếng Hàn mỗi ngày."],
  전화: ["시간이 있으면 저에게 전화해 주세요.", "Nếu có thời gian, hãy gọi điện cho tôi nhé."],
  제: ["이 파란 우산은 제 우산이에요.", "Chiếc ô màu xanh này là ô của tôi."],
  주소: ["택배를 받을 주소를 확인해 주세요.", "Hãy kiểm tra địa chỉ nhận hàng."],
  직업: ["꿈을 이루는 직업을 찾고 싶어요.", "Tôi muốn tìm một nghề giúp mình thực hiện ước mơ."],
  학과: ["관심 있는 학과를 천천히 선택하세요.", "Hãy từ từ lựa chọn khoa mà bạn quan tâm."],
  학번: ["도서관에 들어갈 때 학번이 필요해요.", "Khi vào thư viện cần có mã số sinh viên."],
  학생증: ["학생증을 보여 주면 할인을 받을 수 있어요.", "Nếu xuất trình thẻ sinh viên, bạn có thể được giảm giá."],
  한국어: ["한국어로 자연스럽게 대화하고 싶어요.", "Tôi muốn trò chuyện tự nhiên bằng tiếng Hàn."],
  한국어과: ["한국어과에서 한국 문화도 함께 배워요.", "Ở khoa tiếng Hàn, chúng tôi còn học cả văn hóa Hàn Quốc."],
};

function artworkFor(index: number) {
  if (index === 3) return "/flag-japan.svg";
  if (index === 9) return "/flag-indonesia.svg";
  if (index < 16) return `/vocab-country-${index}.png?v=3`;
  if (index < 26) return `/vocab-job-${index - 16}.png?v=3`;
  if (index < 31) return `/vocab-greeting-${index - 26}.png?v=3`;
  return `/vocab-new-${index - 31}.png?v=3`;
}

function generatedExample(
  korean: string,
  vietnamese: string,
  category: string,
  index: number,
) {
  const specific = specificExamples[korean];
  if (specific) return specific;
  if (category === "Quốc gia") {
    const examples = [
      [`${korean} 음식이 정말 맛있어요.`, `Món ăn ${vietnamese} rất ngon.`],
      [`올해 ${korean}에 여행하고 싶어요.`, `Năm nay tôi muốn du lịch đến ${vietnamese}.`],
      [`${korean}는 아름다운 나라예요.`, `${vietnamese} là một đất nước xinh đẹp.`],
    ] as const;
    return examples[index % examples.length];
  }
  if (category === "Nghề nghiệp") {
    const examples = [
      [`제 친구는 ${korean}입니다.`, `Bạn tôi là ${vietnamese}.`],
      [`나중에 ${korean}가 되고 싶어요.`, `Sau này tôi muốn trở thành ${vietnamese}.`],
    ] as const;
    return examples[index % examples.length];
  }
  if (category === "Lời chào") return [korean, vietnamese] as const;
  return [
    `오늘 “${korean}”라는 단어를 배웠어요.`,
    `Hôm nay tôi đã học từ “${vietnamese}”.`,
  ] as const;
}

const grammar = [
  {
    id: "grammar-01-imnida",
    form: "입니다",
    title: "Là…",
    explanation: "Gắn sau danh từ để giới thiệu hoặc xác nhận một người hay sự vật. Đây là cách nói trang trọng, thường dùng khi mới gặp hoặc trong hoàn cảnh lịch sự.",
    formula: "Danh từ + 입니다",
    examples: [
      { id: "grammar-01-example-01", korean: "저는 민수입니다.", vietnamese: "Tôi là Minsu." },
      { id: "grammar-01-example-02", korean: "제 직업은 의사입니다.", vietnamese: "Nghề của tôi là bác sĩ." },
      { id: "grammar-01-example-03", korean: "이것은 학생증입니다.", vietnamese: "Đây là thẻ sinh viên." },
    ],
  },
  {
    id: "grammar-02-imnikka",
    form: "입니까?",
    title: "Có phải là… không?",
    explanation: "Gắn sau danh từ để tạo câu hỏi xác nhận trang trọng. Khi nói, hãy lên giọng nhẹ ở cuối câu.",
    formula: "Danh từ + 입니까?",
    examples: [
      { id: "grammar-02-example-01", korean: "유나 씨는 회사원입니까?", vietnamese: "Bạn Yuna là nhân viên công ty phải không?" },
      { id: "grammar-02-example-02", korean: "이것은 한국어 책입니까?", vietnamese: "Đây có phải là sách tiếng Hàn không?" },
      { id: "grammar-02-example-03", korean: "직업이 교사입니까?", vietnamese: "Nghề của bạn là giáo viên phải không?" },
    ],
  },
  {
    id: "grammar-03-topic",
    form: "은/는",
    title: "Tiểu từ chủ đề",
    explanation: "Đặt sau danh từ để nêu chủ đề đang được nói đến hoặc tạo ý đối chiếu. Dùng 은 sau danh từ có phụ âm cuối và 는 sau danh từ không có phụ âm cuối.",
    formula: "Có phụ âm cuối + 은 · Không có phụ âm cuối + 는",
    examples: [
      { id: "grammar-03-example-01", korean: "제 이름은 수진입니다.", vietnamese: "Tên tôi là Sujin." },
      { id: "grammar-03-example-02", korean: "저는 베트남 사람입니다.", vietnamese: "Tôi là người Việt Nam." },
      { id: "grammar-03-example-03", korean: "민호 씨는 학생입니다.", vietnamese: "Bạn Minho là sinh viên." },
    ],
  },
] as const;

const grammarExercises = [
  ["저는 베트남 사람___", "Tôi là người Việt Nam.", "입니다"],
  ["지민 씨는 학생___?", "Bạn Jimin có phải là học sinh không?", "입니까"],
  ["제 이름___ 하린입니다.", "Tên tôi là Harin.", "은"],
  ["우리 형은 회사원___", "Anh trai tôi là nhân viên công ty.", "입니다"],
  ["수아 씨___ 의사입니까?", "Bạn Sua có phải là bác sĩ không?", "는"],
  ["저는 한국어과 학생___", "Tôi là sinh viên khoa tiếng Hàn.", "입니다"],
  ["이것___ 학생증입니다.", "Đây là thẻ sinh viên.", "은"],
  ["민지 씨___ 선생님입니까?", "Bạn Minji có phải là giáo viên không?", "는"],
  ["제 동생은 의사___?", "Em tôi có phải là bác sĩ không?", "입니까"],
  ["그분___ 한국 사람입니다.", "Người đó là người Hàn Quốc.", "은"],
] as const;

const dictationSentences = [
  "저는 베트남 사람입니다.",
  "민수 씨는 학생입니다.",
  "제 이름은 수진입니다.",
  "이것은 학생증입니다.",
  "저는 한국어를 공부합니다.",
  "유나 씨는 회사원입니까?",
  "그분은 선생님입니다.",
  "제 직업은 의사입니다.",
  "저는 대학교 학생입니다.",
  "전화번호가 어떻게 됩니까?",
  "저는 한국어과 학생입니다.",
  "안녕하세요? 처음 뵙겠습니다.",
  "저는 은행원입니다.",
  "민호 씨는 한국 사람입니다.",
  "이메일 주소가 어떻게 됩니까?",
] as const;

const translationPairs = [
  ["Tôi là người Việt Nam.", "저는 베트남 사람입니다."],
  ["Bạn Minsu là học sinh.", "민수 씨는 학생입니다."],
  ["Tên tôi là Sujin.", "제 이름은 수진입니다."],
  ["Đây là thẻ sinh viên.", "이것은 학생증입니다."],
  ["Tôi học tiếng Hàn.", "저는 한국어를 공부합니다."],
  ["Bạn Yuna là nhân viên công ty phải không?", "유나 씨는 회사원입니까?"],
  ["Người đó là giáo viên.", "그분은 선생님입니다."],
  ["Nghề của tôi là bác sĩ.", "제 직업은 의사입니다."],
  ["Tôi là sinh viên đại học.", "저는 대학교 학생입니다."],
  ["Số điện thoại là bao nhiêu?", "전화번호가 어떻게 됩니까?"],
  ["Tôi là sinh viên khoa tiếng Hàn.", "저는 한국어과 학생입니다."],
  ["Xin chào, rất vui được gặp bạn.", "안녕하세요? 반갑습니다."],
  ["Tôi là nhân viên ngân hàng.", "저는 은행원입니다."],
  ["Bạn Minho là người Hàn Quốc.", "민호 씨는 한국 사람입니다."],
  ["Địa chỉ email là bao nhiêu?", "이메일 주소가 어떻게 됩니까?"],
] as const;

export const lessonOne = defineLesson({
  id: "lesson-topik-1-01",
  slug: "gioi-thieu",
  courseId: "course-topik-1",
  moduleId: "module-topik-1-foundation",
  order: 1,
  version: 1,
  status: "published",
  title: {
    ko: "소개",
    vi: "Giới thiệu bản thân",
  },
  summary:
    "Học cách giới thiệu tên, quốc tịch, nghề nghiệp và hỏi thông tin cơ bản một cách lịch sự.",
  objectives: [
    "Giới thiệu tên, quốc tịch và nghề nghiệp.",
    "Sử dụng 입니다 và 입니까? trong tình huống trang trọng.",
    "Phân biệt và sử dụng tiểu từ chủ đề 은/는.",
  ],
  vocabulary: vocabularySource.map(
    ([korean, vietnamese, category, romanization], index) => {
      const [exampleKorean, exampleVietnamese] = generatedExample(
        korean,
        vietnamese,
        category,
        index,
      );
      return {
        id: `vocabulary-01-${String(index + 1).padStart(2, "0")}`,
        korean,
        vietnamese,
        category,
        romanization,
        imageUrl: artworkFor(index),
        examples: [
          {
            id: `vocabulary-01-${String(index + 1).padStart(2, "0")}-example-01`,
            korean: exampleKorean,
            vietnamese: exampleVietnamese,
          },
        ],
      };
    },
  ),
  grammar: grammar.map((item) => ({
    ...item,
    examples: item.examples.map((example) => ({ ...example })),
  })),
  exercises: [
    ...grammarExercises.map(([prompt, translation, answer], index) => ({
      id: `exercise-grammar-${String(index + 1).padStart(2, "0")}`,
      type: "fill-blank" as const,
      prompt,
      translation,
      acceptedAnswers: [answer],
      points: 1,
    })),
    ...dictationSentences.map((sentence, index) => ({
      id: `exercise-dictation-${String(index + 1).padStart(2, "0")}`,
      type: "dictation" as const,
      sentence,
      points: 1,
    })),
    ...translationPairs.map(([vietnamese, korean], index) => ({
      id: `exercise-translation-${String(index + 1).padStart(2, "0")}`,
      type: "translation" as const,
      vietnamese,
      korean,
      acceptedVietnameseAnswers: [vietnamese],
      acceptedKoreanAnswers: [korean],
      points: 1,
    })),
  ],
});

export const lessonOneView = {
  vocabulary: lessonOne.vocabulary.map(
    (item) => [item.korean, item.vietnamese, item.category] as const,
  ),
  romanization: Object.fromEntries(
    lessonOne.vocabulary.map((item) => [item.korean, item.romanization]),
  ),
  grammar: lessonOne.grammar.map((item) => ({
    form: item.form,
    title: item.title,
    explanation: item.explanation,
    formula: item.formula,
    examples: item.examples.map(
      (example) => [example.korean, example.vietnamese] as const,
    ),
  })),
  grammarExercises: lessonOne.exercises
    .filter((exercise) => exercise.type === "fill-blank")
    .map((exercise) => ({
      prompt: exercise.prompt,
      translation: exercise.translation,
      answer: exercise.acceptedAnswers[0],
    })),
  dictationSentences: lessonOne.exercises
    .filter((exercise) => exercise.type === "dictation")
    .map((exercise) => exercise.sentence),
  translationPairs: lessonOne.exercises
    .filter((exercise) => exercise.type === "translation")
    .map((exercise) => [exercise.vietnamese, exercise.korean] as const),
} as const;
