from fastapi import APIRouter

router = APIRouter(prefix="/course_records", tags=["F4 - 修課紀錄"])

@router.get("/{student_id}")
async def get_student_course_history(student_id: int):
    # 根據 ExportedReport.pdf 提取的真實課號與課程
    return [
        # 111-1 學年度
        # --- 專業必修課程 (Department Required) ---
        {"academic_year":"111", "semester": "1", "code": "IM112", "section": "B", "name": "計算機概論", "department_id": "資管系", "grade_level": "1", "credits": "3", "type": "required", "instructor": "謝瑞建", "capacity": "50", "grade": "91", "status":"已修完", "pass_flag": "通過", "time": "402,403,404", "location": "1102", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "1", "code": "IM119", "section": "B", "name": "程式設計(一)", "department_id": "資管系", "grade_level": "1", "credits": "3", "type": "required", "instructor": "郭文嘉", "capacity": "50", "grade": "90", "status":"已修完", "pass_flag": "通過", "time": "106,107,108,506,507", "location": "1102,1611", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "1", "code": "IM127", "section": "A", "name": "微積分(含演習)(一)", "department_id": "資管系", "grade_level": "1", "credits": "3", "type": "required", "instructor": "葉佳炫", "capacity": "100", "grade": "76", "status":"已修完", "pass_flag": "通過", "time": "102,103,104,406", "location": "70103", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "1", "code": "IM122", "section": "B", "name": "經濟學", "department_id": "資管系", "grade_level": "1", "credits": "3", "type": "required", "instructor": "葉佳炫", "capacity": "55", "grade": "80", "status":"已修完", "pass_flag": "通過", "time": "302,303,304", "location": "1102", "is_counted": "是", "ranking": "2/50"},

        # --- 共同必修課程 (Common Required) ---
        {"academic_year":"111", "semester": "1", "code": "CL142", "section": "F", "name": "國文(一)", "department_id": "資管系", "grade_level": "1", "credits": "2", "type": "common_required", "instructor": "徐承緒", "capacity": "45", "grade": "87", "status":"已修完", "pass_flag": "通過", "time": "206,207", "location": "1208", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "1", "code": "LC102", "section": "H", "name": "英語(一):中階英語", "department_id": "資管系", "grade_level": "1", "credits": "2", "type": "common_required", "instructor": "外籍老師", "capacity": "35", "grade": "76", "status":"已修完", "pass_flag": "通過", "time": "203,204", "location": "R1202", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "1", "code": "CP111", "section": "A", "name": "基礎程式設計(一)", "department_id": "資管系", "grade_level": "1", "credits": "2", "type": "common_required", "instructor": "郭文嘉", "capacity": "50", "grade": "85", "status":"已修完", "pass_flag": "通過", "time": "407,408", "location": "1611", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "1", "code": "PL101", "section": "B", "name": "體育", "department_id": "資管系", "grade_level": "1", "credits": "0", "type": "common_required", "instructor": "體育老師", "capacity": "40", "grade": "79", "status":"已修完", "pass_flag": "通過", "time": "111,112", "location": "體育館", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "1", "code": "ST101", "section": "A", "name": "服務學習", "department_id": "資管系", "grade_level": "1", "credits": "1", "type": "common_required", "instructor": "系助教", "capacity": "150", "grade": "86", "status":"已修完", "pass_flag": "通過", "time": "501", "location": "R60103", "is_counted": "是", "ranking": "2/50"},
        
        # --- 111-2 學年度 ---
        # --- 專業必修課程 (Department Required) ---
        {"academic_year":"111", "semester": "2", "code": "IM120", "section": "B", "name": "程式設計(二)( D)", "department_id": "資管系","grade_level": "1", "credits": "3", "type": "required", "instructor": "郭文嘉", "capacity": "50", "grade": "60", "status":"已修完","pass_flag": "通過", "time": "106,107,108,506,507", "location": "1102,1611", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "2", "code": "IM121", "section": "B", "name": "會計學", "department_id": "資管系","grade_level": "1", "credits": "3", "type": "required", "instructor": "曾淑珍", "capacity": "55", "grade": "71", "status":"已修完","pass_flag": "通過", "time": "302,303,304", "location": "1102", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "2", "code": "IM128", "section": "A", "name": "微積分(含演習)(二)", "department_id": "資管系","grade_level": "1", "credits": "3", "type": "required", "instructor": "葉佳炫", "capacity": "100", "grade": "83", "status":"已修完","pass_flag": "通過", "time": "102,103,104,406", "location": "70103", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "2", "code": "IM132", "section": "A", "name": "管理資訊系統(*)", "department_id": "資管系","grade_level": "1", "credits": "3", "type": "required", "instructor": "邱昭彰", "capacity": "55", "grade": "87", "status":"已修完","pass_flag": "通過", "time": "202,203,204", "location": "1102", "is_counted": "是", "ranking": "2/50"},
        
        # --- 共同必修與通識 ---
        {"academic_year":"111", "semester": "2", "code": "CL165", "section": "F", "name": "國文(二)", "department_id": "資管系","grade_level": "1", "credits": "2", "type": "common_required", "instructor": "徐承緒", "capacity": "45", "grade": "80", "status":"已修完","pass_flag": "通過", "time": "206,207", "location": "1208", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "2", "code": "CP113", "section": "A", "name": "基礎程式設計(二)", "department_id": "資管系","grade_level": "1", "credits": "2", "type": "common_required", "instructor": "郭文嘉", "capacity": "50", "grade": "71", "status":"已修完","pass_flag": "通過", "time": "407,408", "location": "1611", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "2", "code": "PL101", "section": "B", "name": "體育", "department_id": "資管系","grade_level": "1", "credits": "0", "type": "common_required", "instructor": "體育老師", "capacity": "40", "grade": "91", "status":"已修完","pass_flag": "通過", "time": "211,212", "location": "體育館", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"111", "semester": "2", "code": "GN424", "section": "A", "name": "跟著地科去台灣", "department_id": "資管系","grade_level": "1", "credits": "2", "type": "general_education", "instructor": "地科老師", "capacity": "60", "grade": "81", "status":"已修完","pass_flag": "通過", "time": "402,403", "location": "R1103", "is_counted": "是", "ranking": "2/50"},
        
        # --- 112-1 學年度 ---
        {"academic_year":"112", "semester": "1", "code": "IM214", "section": "B", "name": "資料結構", "department_id": "資管系", "grade_level": "2", "credits": "3", "type": "required", "instructor": "陳教授", "capacity": "55", "grade": "95", "status":"已修完", "pass_flag": "通過", "time": "106,107,108", "location": "R60402", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"112", "semester": "1", "code": "IM216", "section": "B", "name": "離散數學", "department_id": "資管系", "grade_level": "2", "credits": "3", "type": "required", "instructor": "謝教授", "capacity": "55", "grade": "85", "status":"已修完", "pass_flag": "通過", "time": "102,103,104", "location": "R60105", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"112", "semester": "1", "code": "IM231", "section": "B", "name": "統計學(一)", "department_id": "資管系", "grade_level": "2", "credits": "3", "type": "required", "instructor": "邱教授", "capacity": "55", "grade": "87", "status":"已修完", "pass_flag": "通過", "time": "402,403,404", "location": "R60501", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"112", "semester": "1", "code": "IM208", "section": "B", "name": "資料庫管理", "department_id": "資管系", "grade_level": "2", "credits": "3", "type": "required", "instructor": "詹教授", "capacity": "55", "grade": "87", "status":"已修完", "pass_flag": "通過", "time": "202,203,204", "location": "R60305", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"112", "semester": "1", "code": "IM224", "section": "B", "name": "線性代數", "department_id": "資管系", "grade_level": "2", "credits": "3", "type": "required", "instructor": "林教授", "capacity": "55", "grade": "100", "status":"已修完", "pass_flag": "通過", "time": "302,303,304", "location": "R60103", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"112", "semester": "1", "code": "IM106", "section": "A", "name": "管理學", "department_id": "資管系", "grade_level": "2", "credits": "3", "type": "required", "instructor": "陳老師", "capacity": "60", "grade": "88", "status":"已修完", "pass_flag": "通過", "time": "206,207,208", "location": "R1102", "is_counted": "是", "ranking": "2/50"},
        
        # --- 語言與通識課程 ---
        {"academic_year":"112", "semester": "1", "code": "EL260", "section": "H", "name": "應試加強班", "department_id": "資管系", "grade_level": "2", "credits": "2", "type": "common_required", "instructor": "Language Teacher", "capacity": "35", "grade": "84", "status":"已修完", "pass_flag": "通過", "time": "407,408", "location": "R1202", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"112", "semester": "1", "code": "EL235", "section": "A", "name": "英中基礎翻譯", "department_id": "資管系", "grade_level": "2", "credits": "2", "type": "common_required", "instructor": "翻譯老師", "capacity": "30", "grade": "81", "status":"已修完", "pass_flag": "通過", "time": "306,307", "location": "R1210", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"112", "semester": "1", "code": "LS230", "section": "G", "name": "疾病概論", "department_id": "資管系", "grade_level": "2", "credits": "2", "type": "general_education", "instructor": "醫學教授", "capacity": "80", "grade": "91", "status":"已修完", "pass_flag": "通過", "time": "503,504", "location": "R1104", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"112", "semester": "1", "code": "PL334", "section": "W", "name": "重量訓練", "department_id": "資管系", "grade_level": "2", "credits": "0", "type": "common_required", "instructor": "體育老師", "capacity": "30", "grade": "60", "status":"已修完", "pass_flag": "通過", "time": "111,112", "location": "體育館", "is_counted": "是", "ranking": "2/50"},
        
        # --- 112-2 學年度 ---
        {"academic_year":"112", "semester": "2", "code": "IM232", "section": "B", "name": "統計學(二)", "department_id": "資管系", "grade_level": "2", "credits": "3", "type": "required", "instructor": "邱教授", "capacity": "55", "grade": "89", "status":"已修完", "pass_flag": "通過", "time": "402,403,404", "location": "R60501", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"112", "semester": "2", "code": "IM208", "section": "B", "name": "資料庫管理", "department_id": "資管系", "grade_level": "2", "credits": "3", "type": "required", "instructor": "詹教授", "capacity": "55", "grade": "87", "status":"已修完", "pass_flag": "通過", "time": "302,303,304", "location": "R60305", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"112", "semester": "2", "code": "IM226", "section": "B", "name": "網際網路程式設計(*D)", "department_id": "資管系", "grade_level": "2", "credits": "3", "type": "required", "instructor": "郭教授", "capacity": "55", "grade": "86", "status":"已修完", "pass_flag": "通過", "time": "202,203,204", "location": "R1102", "is_counted": "是", "ranking": "2/50"},
        
        # --- 通識與共同必修 ---
        {"academic_year":"112", "semester": "2", "code": "ID009", "section": "A", "name": "客家與台灣", "department_id": "資管系", "grade_level": "2", "credits": "2", "type": "general_education", "instructor": "客研老師", "capacity": "60", "grade": "79", "status":"已修完", "pass_flag": "通過", "time": "206,207", "location": "R1103", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"112", "semester": "2", "code": "PL223", "section": "C", "name": "自由車", "department_id": "資管系", "grade_level": "2", "credits": "0", "type": "common_required", "instructor": "體育老師", "capacity": "30", "grade": "93", "status":"已修完", "pass_flag": "通過", "time": "407,408", "location": "操場", "is_counted": "是", "ranking": "2/50"},
        
        # --- 113-1 學年度 ---
        # 專業必修：頂石課程與核心實務
        {"academic_year":"113", "semester": "1", "code": "IM360", "section": "B", "name": "學術類畢業專題頂石課程(一)", "department_id": "資管系", "grade_level": "3", "credits": "3", "type": "required", "instructor": "專題指導教授", "capacity": "50", "grade": "94", "status":"已修完", "pass_flag": "通過", "time": "102,103,104", "location": "Lab603", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"113", "semester": "1", "code": "IM303", "section": "B", "name": "系統分析與設計(*D)", "department_id": "資管系", "grade_level": "3", "credits": "3", "type": "required", "instructor": "王老師", "capacity": "55", "grade": "87", "status":"已修完", "pass_flag": "通過", "time": "402,403,404", "location": "R60501", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"113", "semester": "1", "code": "IM313", "section": "B", "name": "財務管理", "department_id": "資管系", "grade_level": "3", "credits": "3", "type": "required", "instructor": "林教授", "capacity": "55", "grade": "67", "status":"已修完", "pass_flag": "通過", "time": "206,207,208", "location": "R60102", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"113", "semester": "1", "code": "IM332", "section": "B", "name": "服務與科技管理(E*)", "department_id": "資管系", "grade_level": "3", "credits": "3", "type": "required", "instructor": "陳教授", "capacity": "55", "grade": "71", "status":"已修完", "pass_flag": "通過", "time": "302,303,304", "location": "R60201", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"113", "semester": "1", "code": "IM349", "section": "A", "name": "專業實習講座", "department_id": "資管系", "grade_level": "3", "credits": "0", "type": "required", "instructor": "系主任", "capacity": "150", "grade": "95", "status":"已修完", "pass_flag": "通過", "time": "501", "location": "R60103", "is_counted": "是", "ranking": "2/50"},

        # 專業選修：技術深耕
        {"academic_year":"113", "semester": "1", "code": "IM345", "section": "A", "name": "Python程式設計(*D)", "department_id": "資管系", "grade_level": "3", "credits": "3", "type": "elective", "instructor": "郭老師", "capacity": "50", "grade": "98", "status":"已修完", "pass_flag": "通過", "time": "406,407,408", "location": "R1611", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"113", "semester": "1", "code": "IM348", "section": "A", "name": "網路安全", "department_id": "資管系", "grade_level": "3", "credits": "3", "type": "elective", "instructor": "張教授", "capacity": "45", "grade": "86", "status":"已修完", "pass_flag": "通過", "time": "202,203,204", "location": "R60402", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"113", "semester": "1", "code": "IM347", "section": "A", "name": "量化研究方法實務", "department_id": "資管系", "grade_level": "3", "credits": "3", "type": "elective", "instructor": "徐教授", "capacity": "40", "grade": "88", "status":"已修完", "pass_flag": "通過", "time": "506,507,508", "location": "R60105", "is_counted": "是", "ranking": "2/50"},

        # 通識課程
        {"academic_year":"113", "semester": "1", "code": "GN220", "section": "G", "name": "醫學工程概論", "department_id": "資管系", "grade_level": "3", "credits": "2", "type": "general_education", "instructor": "醫工系老師", "capacity": "60", "grade": "88", "status":"已修完", "pass_flag": "通過", "time": "306,307", "location": "R1104", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"113", "semester": "1", "code": "FC003", "section": "B", "name": "經典選讀", "department_id": "資管系", "grade_level": "3", "credits": "2", "type": "general_education", "instructor": "通識中心", "capacity": "80", "grade": "84", "status":"已修完", "pass_flag": "通過", "time": "203,204", "location": "R1202", "is_counted": "是", "ranking": "2/50"},
        
        # --- 113-2 學年度 ---
        # 專業必修
        {"academic_year":"113", "semester": "2", "code": "IM316", "section": "A", "name": "管理科學", "department_id": "資管系", "grade_level": "3", "credits": "3", "type": "required", "instructor": "林教授", "capacity": "55", "grade": "89", "status":"已修完", "pass_flag": "通過", "time": "202,203,204", "location": "R60102", "is_counted": "是", "ranking": "2/50"},
        
        # 專業選修
        {"academic_year":"113", "semester": "2", "code": "IM236", "section": "A", "name": "數據分析導論", "department_id": "資管系", "grade_level": "3", "credits": "3", "type": "elective", "instructor": "張教授", "capacity": "50", "grade": "71", "status":"已修完", "pass_flag": "通過", "time": "306,307,308", "location": "R1611", "is_counted": "是", "ranking": "2/50"},

        # 審查報表提到的未通過或待處理項目 (根據報表註記)
        {"academic_year":"113", "semester": "2", "code": "EL360", "section": "Z", "name": "英語檢定", "department_id": "資管系", "grade_level": "3", "credits": "1", "type": "common_required", "instructor": "無", "capacity": "0", "grade": "0", "status":"未過", "pass_flag": "未過", "time": "無", "location": "無", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"113", "semester": "2", "code": "IM307", "section": "A", "name": "軟體專案管理(*E)", "department_id": "資管系", "grade_level": "3", "credits": "3", "type": "required", "instructor": "待定", "capacity": "55", "grade": "0", "status":"未過", "pass_flag": "未過", "time": "402,403,404", "location": "待定", "is_counted": "是", "ranking": "2/50"},
        
        # --- 114-1 學年度 ---
        # 專業必修：頂石課程圓滿達成
        {"academic_year":"114", "semester": "1", "code": "M446", "section": "B", "name": "學術類畢業專題頂石課程(二)", "department_id": "資管系", "grade_level": "4", "credits": "3", "type": "required", "instructor": "專題指導教授", "capacity": "50", "grade": "90", "status":"已修完", "pass_flag": "通過", "time": "111,112,113", "location": "Lab603", "is_counted": "是", "ranking": "2/50"},
        {"academic_year":"114", "semester": "1", "code": "IM402", "section": "A", "name": "決策支援系統(*)", "department_id": "資管系", "grade_level": "4", "credits": "3", "type": "required", "instructor": "高教授", "capacity": "55", "grade": "70", "status":"已修完", "pass_flag": "通過", "time": "306,307,308", "location": "R60103", "is_counted": "是", "ranking": "2/50"},
        
        # 專業選修：跨語言開發
        {"academic_year":"114", "semester": "1", "code": "IM239", "section": "A", "name": "JAVA程式設計", "department_id": "資管系", "grade_level": "4", "credits": "3", "type": "elective", "instructor": "郭老師", "capacity": "50", "grade": "77", "status":"已修完", "pass_flag": "通過", "time": "202,203,204", "location": "R1611", "is_counted": "是", "ranking": "2/50"},
        
        # --- 114-2 學年度 (當前學期) ---
        # 這是畢業審查報表中標記為「未過」的關鍵必修課，也是你目前正在執行的專案核心
        {
            "academic_year": "114", "semester": "2", "code": "IM307","section": "A", "name": "軟體專案管理(*E)", 
            "department_id": "資管系", 
            "grade_level": "4", 
            "credits": "3", 
            "type": "required", 
            "instructor": "系上教授", 
            "capacity": "55", 
            "grade": "0",          # 報表顯示未送成績
            "status": "修讀中",     # 報表標記為未過，實務上為本學期修習中
            "pass_flag": "未過",    # 根據畢業審查未通過原因說明
            "time": "302,303,304", # 模擬元智資管典型排課時間
            "location": "R60103", 
            "is_counted": "是", "ranking": "2/50"
        },
    
    ]