import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import "dotenv/config"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Seeding CareFlow database…")

  const now = new Date()

  // 1. Create a demo organisation
  let org = await prisma.organisation.findFirst({ where: { name: "Sunrise Care Home" } })
  if (!org) {
    org = await prisma.organisation.create({
      data: {
        name: "Sunrise Care Home",
        type: "CARE_HOME",
        registrationNo: "CQC-12345678",
        regulatoryBody: "CQC",
        address: "12 Sunrise Lane, Birmingham, B1 2AB",
        phone: "0121 000 0000",
        email: "info@sunrise.demo",
      },
    })
  }
  console.log(`  ✅ Organisation: ${org.name} (${org.id})`)

  // 2. Create staff accounts
  const passwordHash = await bcrypt.hash("Password123!", 12)

  const manager = await prisma.user.upsert({
    where: { email: "manager@sunrise.demo" },
    update: {},
    create: {
      organisationId: org.id,
      email: "manager@sunrise.demo",
      firstName: "Sarah",
      lastName: "Thompson",
      passwordHash,
      role: "MANAGER",
      jobTitle: "Registered Manager",
      isActive: true,
    },
  })

  const seniorCarer = await prisma.user.upsert({
    where: { email: "senior@sunrise.demo" },
    update: {},
    create: {
      organisationId: org.id,
      email: "senior@sunrise.demo",
      firstName: "James",
      lastName: "Okafor",
      passwordHash,
      role: "SENIOR_CARER",
      jobTitle: "Senior Care Worker",
      isActive: true,
    },
  })

  const carer = await prisma.user.upsert({
    where: { email: "carer@sunrise.demo" },
    update: {},
    create: {
      organisationId: org.id,
      email: "carer@sunrise.demo",
      firstName: "Priya",
      lastName: "Patel",
      passwordHash,
      role: "CARE_STAFF",
      jobTitle: "Care Worker",
      isActive: true,
    },
  })

  console.log(`  ✅ Users: ${manager.firstName}, ${seniorCarer.firstName}, ${carer.firstName}`)

  // 3. Create sample residents
  const residentsData = [
    {
      firstName: "Margaret",
      lastName: "Williams",
      preferredName: "Maggie",
      dateOfBirth: new Date("1938-03-14"),
      gender: "FEMALE",
      nhsNumber: "4567891023",
      roomNumber: "12",
      religion: "Church of England",
      ethnicity: "White British",
      language: "English",
      admissionDate: new Date("2022-06-01"),
      status: "ADMITTED",
    },
    {
      firstName: "George",
      lastName: "Patel",
      preferredName: "George",
      dateOfBirth: new Date("1942-11-30"),
      gender: "MALE",
      nhsNumber: "7890123456",
      roomNumber: "7",
      religion: "Hindu",
      ethnicity: "Asian British",
      language: "English",
      admissionDate: new Date("2023-01-15"),
      status: "ADMITTED",
    },
    {
      firstName: "Dorothy",
      lastName: "Clarke",
      preferredName: "Dot",
      dateOfBirth: new Date("1935-07-22"),
      gender: "FEMALE",
      nhsNumber: "3214567890",
      roomNumber: "3",
      religion: "Roman Catholic",
      ethnicity: "White Irish",
      language: "English",
      admissionDate: new Date("2021-09-08"),
      status: "ADMITTED",
    },
    {
      firstName: "Robert",
      lastName: "Ahmed",
      preferredName: "Bob",
      dateOfBirth: new Date("1944-02-05"),
      gender: "MALE",
      nhsNumber: "9876543210",
      roomNumber: "18",
      religion: "Islam",
      ethnicity: "Asian British",
      language: "English",
      admissionDate: new Date("2023-08-20"),
      status: "ADMITTED",
    },
    {
      firstName: "Edith",
      lastName: "Murphy",
      preferredName: "Edie",
      dateOfBirth: new Date("1939-12-01"),
      gender: "FEMALE",
      nhsNumber: "1234509876",
      roomNumber: "21",
      religion: "Methodist",
      ethnicity: "White British",
      language: "English",
      admissionDate: new Date("2022-03-17"),
      status: "ADMITTED",
    },
    // Pre-pipeline residents
    {
      firstName: "Arthur",
      lastName: "Henderson",
      preferredName: "Art",
      dateOfBirth: new Date("1941-05-19"),
      gender: "MALE",
      nhsNumber: "5551234567",
      roomNumber: null,
      religion: "Church of England",
      ethnicity: "White British",
      language: "English",
      admissionDate: null,
      status: "PRE_ASSESSED",
    },
    {
      firstName: "Beatrice",
      lastName: "Saunders",
      preferredName: "Bea",
      dateOfBirth: new Date("1945-09-03"),
      gender: "FEMALE",
      nhsNumber: "5559876543",
      roomNumber: null,
      religion: "None",
      ethnicity: "White British",
      language: "English",
      admissionDate: null,
      status: "ENQUIRY",
    },
  ]

  const residents = []
  for (const resData of residentsData) {
    let resident = await prisma.resident.findFirst({
      where: { organisationId: org.id, nhsNumber: resData.nhsNumber },
    })
    if (!resident) {
      resident = await prisma.resident.create({
        data: { organisationId: org.id, ...resData } as any,
      })
    }
    residents.push(resident)
  }
  console.log(`  ✅ Residents: ${residents.map((r) => r.firstName).join(", ")}`)

  // 4. Create medical records for each resident
  const medicalData = [
    {
      residentId: residents[0].id,
      diagnoses: ["Vascular dementia", "Hypertension", "Type 2 diabetes", "Osteoarthritis"],
      allergies: ["Penicillin"],
      mobilityLevel: "ONE_PERSON_ASSIST",
      continenceLevel: "OCCASIONALLY_INCONTINENT",
    },
    {
      residentId: residents[1].id,
      diagnoses: ["Parkinson's disease", "Hypertension", "Constipation"],
      allergies: [] as string[],
      mobilityLevel: "SUPERVISED",
      continenceLevel: "CONTINENT",
    },
    {
      residentId: residents[2].id,
      diagnoses: ["Alzheimer's disease", "Anaemia", "Heart failure"],
      allergies: ["Aspirin", "NSAIDs"],
      mobilityLevel: "HOIST",
      continenceLevel: "TOTALLY_INCONTINENT",
    },
    {
      residentId: residents[3].id,
      diagnoses: ["COPD", "Type 2 diabetes", "Peripheral vascular disease"],
      allergies: [] as string[],
      mobilityLevel: "SUPERVISED",
      continenceLevel: "CONTINENT",
    },
    {
      residentId: residents[4].id,
      diagnoses: ["Mixed dementia", "Atrial fibrillation", "Osteoporosis"],
      allergies: ["Latex"],
      mobilityLevel: "SUPERVISED",
      continenceLevel: "OCCASIONALLY_INCONTINENT",
    },
  ]

  // Update residents with GP info (stored on Resident model)
  const gpData = [
    { gpName: "Dr Sarah Jenkins", gpPractice: "Elmwood Surgery", gpPhone: "01234 567890" },
    { gpName: "Dr Amir Hassan", gpPractice: "The Bridge Medical Centre", gpPhone: "01234 789012" },
    { gpName: "Dr Frances O'Brien", gpPractice: "St Mary's Surgery", gpPhone: "01234 345678" },
    { gpName: "Dr James Malik", gpPractice: "Highfield Group Practice", gpPhone: "01234 901234" },
    { gpName: "Dr Helen Carter", gpPractice: "Parkview Medical Group", gpPhone: "01234 567890" },
    { gpName: "Dr Thomas Ward", gpPractice: "Riverside Medical Centre", gpPhone: "01234 112233" },
    { gpName: "Dr Anna Collins", gpPractice: "Greenfield Practice", gpPhone: "01234 445566" },
  ]
  for (let i = 0; i < residents.length; i++) {
    if (gpData[i]) await prisma.resident.update({ where: { id: residents[i].id }, data: gpData[i] })
  }

  for (const med of medicalData) {
    await prisma.residentMedical.upsert({
      where: { residentId: med.residentId },
      update: {},
      create: med as any,
    })
  }
  console.log("  ✅ Medical records created")

  // 5. Sample care notes
  const noteContents = [
    { category: "PERSONAL_CARE", shift: "MORNING", content: "Assisted Maggie with morning wash and dressing. She was in good spirits and chose her own clothes. Skin checked — no new pressure areas noted. Applied prescribed moisturiser to lower legs." },
    { category: "FOOD_FLUID", shift: "AFTERNOON", content: "George ate well at lunch — full portion of shepherd's pie and vegetables. Drank approximately 350ml fluids at lunchtime. Slight tremor noted when using cutlery; encouraged use of adapted cutlery." },
    { category: "WELLBEING", shift: "MORNING", content: "Dot appeared unsettled this morning, calling out repeatedly for her 'mother'. Redirected with reminiscence activity — showed her photograph album. Settled after 20 minutes with one-to-one time. No pain indicators noted." },
    { category: "CONTINENCE", shift: "NIGHT", content: "Bob required two continence pad changes overnight at 01:30 and 04:00. Skin intact on both occasions. Repositioned and settled back to sleep without difficulty." },
    { category: "HEALTH_CONCERN", shift: "MORNING", content: "Edie appears to have a mild cough this morning. Temperature checked: 37.8°C. Encouraged fluids. Manager informed. GP contact details noted in file — will monitor for 24 hours per infection control protocol." },
    { category: "MOBILITY", shift: "AFTERNOON", content: "George attended physiotherapy session today with visiting physiotherapist. Practised walking exercises with Zimmer frame. Physio has recommended twice-daily practise with staff support." },
    { category: "SOCIAL", shift: "AFTERNOON", content: "Maggie enjoyed the visiting entertainer this afternoon and sang along to music from the 1950s. She was smiling and appeared very engaged. Family visited for 2 hours — positive visit." },
    { category: "GENERAL", shift: "MORNING", content: "Routine checks completed — all residents accounted for and in good health at handover start. Morning medications administered by senior carer at 08:00. No concerns to report." },
  ]

  const careNoteResidents = [residents[0], residents[1], residents[2], residents[3], residents[4], residents[1], residents[0], residents[2]]
  const careNoteAuthors = [carer.id, seniorCarer.id, carer.id, carer.id, seniorCarer.id, carer.id, manager.id, carer.id]

  for (let i = 0; i < noteContents.length; i++) {
    const createdAt = new Date(now.getTime() - (i * 6 + Math.random() * 4) * 60 * 60 * 1000)
    await prisma.careNote.create({
      data: {
        organisationId: org.id,
        residentId: careNoteResidents[i].id,
        authorId: careNoteAuthors[i],
        category: noteContents[i].category as any,
        shift: noteContents[i].shift as any,
        content: noteContents[i].content,
        createdAt,
      },
    })
  }
  console.log("  ✅ Care notes created")

  // 6. Sample incident
  const existingIncident = await prisma.incident.findFirst({ where: { organisationId: org.id } })
  if (!existingIncident) {
    await prisma.incident.create({
      data: {
        organisationId: org.id,
        residentId: residents[2].id,
        reportedById: carer.id,
        description: "Unwitnessed fall in bedroom. Found Dot on floor beside her bed at 06:45 during morning checks. She was alert and not in distress. No visible injuries. Lowered to safe position on floor with padding. Two staff attended. GP informed. Family contacted. Post-fall observations commenced every 15 minutes for 4 hours.",
        occurredAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        location: "Bedroom",
        type: "FALL",
        severity: "MEDIUM",
        status: "OPEN",
        witnesses: "None — unwitnessed",
      },
    })
  }
  console.log("  ✅ Sample incident created")

  // 7. Seed formal assessments for admitted residents (residents[0] = Margaret, residents[2] = Dorothy)
  const existingAssessment = await prisma.residentAssessment.findFirst({
    where: { resident: { organisationId: org.id } },
  })
  if (!existingAssessment) {
    // Waterlow for Margaret (residents[0]) — high risk
    const waterlowMargaret = await prisma.residentAssessment.create({
      data: {
        residentId: residents[0].id,
        type: "ADMISSION",
        status: "APPROVED",
        completedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(now.getTime() - 59 * 24 * 60 * 60 * 1000),
        approvedBy: manager.id,
        reviewDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // overdue
      },
    })
    await prisma.assessmentDomain.createMany({
      data: [
        {
          assessmentId: waterlowMargaret.id,
          domainType: "WATERLOW",
          content: {
            build_weight: "above_average",
            skin_type: "dry",
            sex_age: "female_64_74",
            malnutrition: "2",
            continence: "occasional_incontinence",
            mobility: "restricted",
            tissue_malnutrition: "terminal_cachexia",
            neurological_deficit: "diabetes",
            major_surgery: "orthopaedic",
          } as any,
          score: 22,
          isComplete: true,
          completedById: seniorCarer.id,
          completedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        },
        {
          assessmentId: waterlowMargaret.id,
          domainType: "FALLS_RISK",
          content: {
            history_of_falls: "yes",
            mental_status: "forgets_limitations",
            ambulatory_aid: "crutches_cane_walker",
            gait: "impaired",
            iv_heparin_lock: "no",
          } as any,
          score: 35,
          isComplete: true,
          completedById: seniorCarer.id,
          completedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        },
        {
          assessmentId: waterlowMargaret.id,
          domainType: "MUST_NUTRITIONAL",
          content: {
            bmi_score: "1",
            weight: "58",
            height: "162",
            weight_loss_score: "1",
            acute_disease: "0",
            eating_poorly: "yes",
          } as any,
          score: 2,
          isComplete: true,
          completedById: carer.id,
          completedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        },
      ],
    })
    // Create a version snapshot
    const marginDomains = await prisma.assessmentDomain.findMany({ where: { assessmentId: waterlowMargaret.id } })
    await prisma.assessmentVersion.create({
      data: {
        assessmentId: waterlowMargaret.id,
        snapshot: { domains: marginDomains, savedAt: new Date().toISOString() } as any,
        createdBy: seniorCarer.id,
      },
    })

    // FALLS_RISK only for Dorothy (residents[2])
    const dorothyAssessment = await prisma.residentAssessment.create({
      data: {
        residentId: residents[2].id,
        type: "ADMISSION",
        status: "APPROVED",
        completedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(now.getTime() - 44 * 24 * 60 * 60 * 1000),
        approvedBy: manager.id,
        reviewDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // due in 15 days
      },
    })
    await prisma.assessmentDomain.create({
      data: {
        assessmentId: dorothyAssessment.id,
        domainType: "WATERLOW",
        content: {
          build_weight: "obese",
          skin_type: "oedematous",
          sex_age: "female_75_80",
          continence: "catheterised",
          mobility: "bedbound",
          tissue_malnutrition: "cardiac_failure",
        } as any,
        score: 28,
        isComplete: true,
        completedById: seniorCarer.id,
        completedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      },
    })

    // Pre-admission assessment for Arthur (residents[5] = PRE_ASSESSED)
    const arthurPreAdmission = await prisma.residentAssessment.create({
      data: {
        residentId: residents[5].id,
        type: "PRE_ADMISSION",
        status: "APPROVED",
        completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        approvedBy: manager.id,
      },
    })
    await prisma.assessmentDomain.createMany({
      data: [
        {
          assessmentId: arthurPreAdmission.id,
          domainType: "PRE_ADMISSION_PERSONAL",
          content: {
            preferred_name: "Art",
            gender: "Male",
            religion: "Church of England",
            language: "English",
            ethnicity: "White British",
            interpreter_needed: false,
          } as any,
          isComplete: true,
          completedById: manager.id,
          completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          assessmentId: arthurPreAdmission.id,
          domainType: "PRE_ADMISSION_CARE_NEEDS",
          content: {
            mobility_needs: "Requires walking frame and supervision outdoors",
            personal_care_needs: "Independent with washing, needs help with lower limbs",
            continence: "Continent, uses toilet independently with rails",
            dietary_needs: "Normal diet, no restrictions",
            communication_method: "Verbal — clear speech",
            known_risks: "Mild hypertension, history of one fall last year",
          } as any,
          isComplete: true,
          completedById: manager.id,
          completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          assessmentId: arthurPreAdmission.id,
          domainType: "PRE_ADMISSION_MEDICAL",
          content: {
            diagnoses: ["Hypertension", "Mild cognitive impairment"],
            allergies: "NKDA",
            current_medications: "Ramipril 5mg OD, Aspirin 75mg OD",
            dnacpr: false,
            mental_capacity: true,
          } as any,
          isComplete: true,
          completedById: manager.id,
          completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
      ],
    })
    await prisma.resident.update({
      where: { id: residents[5].id },
      data: { status: "PRE_ASSESSED", preAssessmentCompletedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
    })

    console.log("  ✅ Sample assessments created")
  } else {
    console.log("  ⏭  Assessments already exist — skipping")
  }
  console.log("\n📧 Demo login credentials:")
  console.log("   Manager:     manager@sunrise.demo / Password123!")
  console.log("   Senior Carer: senior@sunrise.demo / Password123!")
  console.log("   Carer:        carer@sunrise.demo / Password123!")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
