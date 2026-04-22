import asyncio
from datetime import date, timedelta

from app.core.database import create_engine, create_session_factory
from app.models.application import Application, ApplicationStatus, ContractType

SEED_DATA: list[dict] = [
    {
        "company": "Anthropic",
        "position": "AI Research Intern",
        "url": "https://anthropic.com/careers",
        "location": "Paris / Remote",
        "contract_type": ContractType.STAGE,
        "salary_min": 1200,
        "status": ApplicationStatus.NEW,
        "is_favorite": True,
    },
    {
        "company": "OVHcloud",
        "position": "Alternance Cloud Engineer",
        "url": "https://careers.ovhcloud.com",
        "location": "Roubaix",
        "contract_type": ContractType.ALTERNANCE,
        "salary_min": 1500,
        "salary_max": 1800,
        "status": ApplicationStatus.APPLIED,
        "cv_sent": True,
        "date_applied": date.today() - timedelta(days=5),
    },
    {
        "company": "Datadog",
        "position": "Backend Engineer (Alternance M2)",
        "location": "Paris",
        "contract_type": ContractType.ALTERNANCE,
        "salary_min": 1800,
        "salary_max": 2200,
        "status": ApplicationStatus.INTERVIEW,
        "cv_sent": True,
        "date_applied": date.today() - timedelta(days=12),
        "last_contact": date.today() - timedelta(days=2),
        "notes": (
            "Entretien RH passé OK. Technical interview prévu la semaine prochaine."
        ),
    },
    {
        "company": "Scaleway",
        "position": "DevOps Alternance",
        "location": "Paris",
        "contract_type": ContractType.ALTERNANCE,
        "status": ApplicationStatus.FOLLOWED_UP,
        "cv_sent": True,
        "follow_up_done": True,
        "date_applied": date.today() - timedelta(days=18),
        "follow_up_date": date.today() - timedelta(days=4),
    },
    {
        "company": "Doctolib",
        "position": "Platform Engineer",
        "location": "Paris / Levallois",
        "contract_type": ContractType.ALTERNANCE,
        "status": ApplicationStatus.REJECTED,
        "cv_sent": True,
        "date_applied": date.today() - timedelta(days=25),
        "last_contact": date.today() - timedelta(days=10),
        "notes": (
            "Refus poli après entretien RH. Profil M1 pas retenu pour ce poste M2."
        ),
    },
    {
        "company": "BlaBlaCar",
        "position": "Full Stack (Alternance)",
        "location": "Paris",
        "contract_type": ContractType.ALTERNANCE,
        "status": ApplicationStatus.NO_RESPONSE,
        "cv_sent": True,
        "date_applied": date.today() - timedelta(days=45),
    },
    {
        "company": "Shadow",
        "position": "Backend Python Alternance",
        "location": "Paris",
        "contract_type": ContractType.ALTERNANCE,
        "salary_min": 1400,
        "status": ApplicationStatus.APPLIED,
        "cv_sent": True,
        "date_applied": date.today() - timedelta(days=3),
        "is_favorite": True,
    },
    {
        "company": "Dataiku",
        "position": "Software Engineer Intern",
        "location": "Paris",
        "contract_type": ContractType.STAGE,
        "status": ApplicationStatus.NEW,
    },
]


async def seed() -> None:
    engine = create_engine()
    session_factory = create_session_factory(engine)
    try:
        async with session_factory() as session:
            for data in SEED_DATA:
                session.add(Application(**data))
            await session.commit()
            print(f"Seeded {len(SEED_DATA)} applications.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
