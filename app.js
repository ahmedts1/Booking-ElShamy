const SUPABASE_URL = "https://nknmdsjhhgfgwwofbpzg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJua25tZHNqaGhnZmd3d29mYnB6ZyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgzMDI1NzQ5LCJleHAiOjIwOTg2MDE3NDl9.jGGvCBs9li3L8lSiJd8VOMIq9_L2AipGbyY70fmbEQw";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const form = document.getElementById("registrationForm");
const submitButton = document.getElementById("submitButton");
const messageBox = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const studentName = document.getElementById("studentName").value.trim().replace(/\s+/g, " ");
  const phone = normalizePhone(document.getElementById("phone").value);
  const area = document.getElementById("area").value;
  const gender = getCheckedValue("gender");
  const studySystem = getCheckedValue("studySystem");

  if (!studentName || !phone || !area || !gender || !studySystem) {
    showMessage("من فضلك أكمل جميع البيانات.", "error");
    return;
  }

  if (studentName.length < 3) {
    showMessage("من فضلك اكتب الاسم بالكامل.", "error");
    return;
  }

  if (!/^01[0125][0-9]{8}$/.test(phone)) {
    showMessage("من فضلك اكتب رقم موبايل مصري صحيح مكوّن من 11 رقمًا.", "error");
    return;
  }

  setLoading(true);

  try {
    const { error } = await client.from("student_registrations").insert({
      student_name: studentName,
      phone,
      area,
      gender,
      study_system: studySystem
    });

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        showMessage("رقم الهاتف مسجل من قبل.", "error");
      } else {
        showMessage("حدث خطأ أثناء التسجيل. تأكد من الاتصال وحاول مرة أخرى.", "error");
      }
      return;
    }

    form.reset();
    showMessage("تم تسجيل بياناتك بنجاح ✅", "success");
  } catch (error) {
    console.error(error);
    showMessage("حدث خطأ غير متوقع. حاول مرة أخرى.", "error");
  } finally {
    setLoading(false);
  }
});

function getCheckedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function normalizePhone(value) {
  const arabicNumbers = "٠١٢٣٤٥٦٧٨٩";
  const persianNumbers = "۰۱۲۳۴۵۶۷۸۹";

  return value
    .trim()
    .replace(/[٠-٩]/g, (digit) => arabicNumbers.indexOf(digit))
    .replace(/[۰-۹]/g, (digit) => persianNumbers.indexOf(digit))
    .replace(/\D/g, "");
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "جاري التسجيل..." : "تسجيل البيانات";
}

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}
