import math
import random
import uuid
from datetime import datetime, timedelta, date, timezone
from sqlmodel import Session, select
from backend.app.database import engine, init_db
from backend.models import (
    Centre, Medicine, StockLevel, Transaction, SupplyParam,
    Alert, AlertEvent, DailyPatient, User, UserScope,
    CanonicalMedicine, MedicineAlias, Facility, Pharmacy,
    InventoryBalance, MedicineBatch, InventoryTransaction,
    TransferOrder, AvailabilityEnquiry, AuditLog,
    MedicationSchedule, MedicationReminderLog, MedicineInfo,
    Notification, Supplier, PurchaseOrder
)
from backend.forecast import (
    build_daily_series, compute_ewma, compute_trend, detect_cusum,
    monte_carlo_forecast, assign_tier, compute_urgency,
    compute_recommended_order, compute_patient_impact, generate_explanations
)
from backend.app.auth import hash_password

def run_seed():
    random.seed(42)
    from sqlmodel import SQLModel
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        print("Creating Centres & Facilities...")

        centres_data = [
            # Exactly 12 primary PHC centres in Coimbatore
            ("phc_valparai", "PHC Valparai", "Anaimalai", "Coimbatore", 10.3254, 76.9558, False, "phc"),
            ("phc_aliyar", "PHC Aliyar", "Anaimalai", "Coimbatore", 10.4020, 76.9712, False, "phc"), # ~8.8 km to Valparai
            ("phc_anaimalai", "PHC Anaimalai Town", "Anaimalai", "Coimbatore", 10.5821, 76.9324, False, "phc"),
            ("phc_pollachi_rural", "PHC Pollachi Rural", "Anaimalai", "Coimbatore", 10.6601, 77.0102, False, "phc"),
            ("phc_kottur", "PHC Kottur", "Anaimalai", "Coimbatore", 10.5350, 77.0200, False, "phc"),
            ("phc_samathur", "PHC Samathur", "Anaimalai", "Coimbatore", 10.5750, 76.9950, False, "phc"),
            # Block 2: Madukkarai Block
            ("phc_madukkarai", "PHC Madukkarai", "Madukkarai", "Coimbatore", 10.9020, 76.9600, False, "phc"),
            ("phc_ettimadai", "PHC Ettimadai", "Madukkarai", "Coimbatore", 10.9080, 76.8980, False, "phc"),
            ("phc_chettipalayam", "PHC Chettipalayam", "Madukkarai", "Coimbatore", 10.9320, 77.0420, False, "phc"),
            ("phc_kinathukadavu", "PHC Kinathukadavu", "Madukkarai", "Coimbatore", 10.8200, 77.0220, True, "phc"), # STALE
            ("phc_thondamuthur", "PHC Thondamuthur", "Madukkarai", "Coimbatore", 10.9950, 76.8320, False, "phc"),
            ("phc_pooluvapatti", "PHC Pooluvapatti", "Madukkarai", "Coimbatore", 10.9700, 76.7850, False, "phc"),
        ]

        additional_facilities = [
            ("hsc_sheikalmudi", "HSC Sheikalmudi (Sub-Centre)", "Anaimalai", "Coimbatore", 10.3100, 76.9400, False, "sub_centre"),
            ("hsc_sholayar", "HSC Sholayar Dam (Sub-Centre)", "Anaimalai", "Coimbatore", 10.2800, 76.8900, False, "sub_centre"),
            ("chc_pollachi", "Community Health Centre Pollachi", "Pollachi", "Coimbatore", 10.6580, 77.0090, False, "chc"),
            ("chc_valparai", "Community Health Centre Valparai", "Anaimalai", "Coimbatore", 10.3280, 76.9520, False, "chc"),
        ]

        centres = []
        for cid, name, block, dist, lat, lng, stale, ftype in centres_data:
            c = Centre(
                id=cid,
                name=name,
                block=block,
                district=dist,
                lat=lat,
                lng=lng,
                is_stale=stale,
                updated_at=datetime.now(timezone.utc) - timedelta(days=4 if stale else 0)
            )
            session.add(c)
            centres.append(c)

            # Mirror to Facility model
            fac = Facility(
                id=cid,
                facility_code=cid.upper(),
                facility_name=name,
                facility_type=ftype,
                block=block,
                district_id=dist.lower(),
                state_id="TN",
                lat=lat,
                lng=lng,
                is_stale=stale
            )
            session.add(fac)

        # Also add additional facilities to Facility model
        for cid, name, block, dist, lat, lng, stale, ftype in additional_facilities:
            fac = Facility(
                id=cid,
                facility_code=cid.upper(),
                facility_name=name,
                facility_type=ftype,
                block=block,
                district_id=dist.lower(),
                state_id="TN",
                lat=lat,
                lng=lng,
                is_stale=stale
            )
            session.add(fac)

        # Seed Pharmacies
        pharmacies_data = [
            ("pharma_apollo_cbe", "PHARM-CBE-01", "Apollo Pharmacy — Gandhipuram", "Cross Cut Road, Gandhipuram, Coimbatore", 10.9980, 76.9650, "TN-CBE-2021-9981", "+91 422 2490111", "VERIFIED_PHARMACY"),
            ("pharma_medplus_rs_puram", "PHARM-CBE-02", "MedPlus Pharmacy — RS Puram", "DB Road, RS Puram, Coimbatore", 11.0060, 76.9490, "TN-CBE-2022-4412", "+91 422 2548899", "VERIFIED_PHARMACY"),
            ("pharma_thulasi_pollachi", "PHARM-POL-01", "Thulasi Pharmacies — Pollachi Bazaar", "Bazaar Street, Pollachi", 10.6620, 77.0080, "TN-POL-2019-1102", "+91 4259 223450", "VERIFIED_PHARMACY"),
            ("pharma_valparai_01", "PHARM-VAL-02", "Valparai Medical Store", "Main Road, Valparai, Coimbatore – 642127", 10.3265, 76.9585, "TN-VAL-2021-0142", "+91 98765 43210", "VERIFIED_PHARMACY"),
            ("pharma_kovai_valparai", "PHARM-VAL-01", "Kovai Medicals — Valparai Hill Top", "Main Road, Valparai", 10.3260, 76.9580, "TN-VAL-2020-0091", "+91 4253 222301", "MANUALLY_REPORTED"),
            ("pharma_aliyar_retail", "PHARM-ALI-01", "Aliyar Medical & General Stores", "Aliyar Dam Junction, Aliyar Nagar", 10.4040, 76.9730, "TN-POL-2023-8874", "+91 4259 288102", "VERIFIED_PHARMACY"),
        ]

        for pid, code, pname, addr, lat, lng, reg_no, phone, dsource in pharmacies_data:
            ph = Pharmacy(
                id=pid,
                pharmacy_code=code,
                pharmacy_name=pname,
                address=addr,
                district_id="coimbatore",
                state_id="TN",
                lat=lat,
                lng=lng,
                registration_number=reg_no,
                contact_phone=phone,
                data_source=dsource
            )
            session.add(ph)

        print("Creating Canonical Medicines...")
        medicines_data = [
            ("med_pcm", "Paracetamol 500mg", "tablets", 30, 730, True, "tablet", "500mg"),
            ("med_pcm_syr", "Paracetamol Syrup 60ml", "bottles", 30, 730, True, "syrup", "60ml"),
            ("med_amox", "Amoxicillin 250mg", "capsules", 30, 730, True, "capsule", "250mg"),
            ("med_amox_500", "Amoxicillin 500mg", "capsules", 30, 730, True, "capsule", "500mg"),
            ("med_ors", "ORS Sachets 20.5g", "sachets", 30, 730, True, "sachet", "20.5g"),
            ("med_zinc", "Zinc Sulfate 20mg", "tablets", 30, 730, True, "tablet", "20mg"),
            ("med_metformin", "Metformin 500mg", "tablets", 30, 1095, True, "tablet", "500mg"),
            ("med_ifa", "Iron and Folic Acid", "tablets", 30, 730, True, "tablet", "100mg+0.5mg"),
            ("med_cetirizine", "Cetirizine 10mg", "tablets", 30, 1095, True, "tablet", "10mg"),
            ("med_alben", "Albendazole 400mg", "tablets", 30, 1095, True, "tablet", "400mg"),
            ("med_asv", "Anti-Snake Venom 10ml Inj", "vials", 30, 730, True, "injection", "10ml"),
            ("med_arv", "Anti-Rabies Vaccine 0.5ml", "vials", 30, 365, True, "injection", "0.5ml"),
            ("med_amlo", "Amlodipine 5mg", "tablets", 30, 1095, True, "tablet", "5mg"),
            ("med_azithro", "Azithromycin 500mg", "tablets", 30, 730, True, "tablet", "500mg"),
            ("med_salbutamol", "Salbutamol Inhaler 100mcg", "inhalers", 30, 730, True, "inhaler", "100mcg"),
            ("med_atropine", "Atropine Sulfate 0.6mg/ml Inj", "ampoules", 30, 730, True, "injection", "0.6mg/ml"),
        ]

        medicines = []
        for mid, name, unit, safety, shelf, essential, form, strength in medicines_data:
            # Legacy Medicine model
            m = Medicine(
                id=mid,
                name=name,
                unit=unit,
                safety_days=safety,
                shelf_life_days=shelf,
                essential=essential
            )
            session.add(m)
            medicines.append(m)

            # Canonical Medicine model
            cm = CanonicalMedicine(
                id=mid,
                canonical_name=name,
                generic_name=name.split()[0],
                strength=strength,
                dosage_form=form,
                unit=unit,
                essential=essential,
                verification_status="VERIFIED"
            )
            session.add(cm)

        # Seed Duplicate Showcase Candidates in Catalogue
        dup_showcase = [
            # 1. Mergeable candidate: same strength (500mg), same form (tablet)
            CanonicalMedicine(
                id="med_pcm_dup",
                canonical_name="Paracetamol Tab 500 mg",
                generic_name="Paracetamol",
                strength="500mg",
                dosage_form="tablet",
                unit="tablets",
                essential=True,
                verification_status="UNVERIFIED"
            ),
            # 2. Mergeable candidate: same strength (250mg), same form (capsule)
            CanonicalMedicine(
                id="med_amox_dup",
                canonical_name="Amoxicillin 250 mg Cap",
                generic_name="Amoxicillin",
                strength="250mg",
                dosage_form="capsule",
                unit="capsules",
                essential=True,
                verification_status="UNVERIFIED"
            ),
            # 3. Clinical distinction guard: same drug, DIFFERENT STRENGTH (650mg vs 500mg) - MUST NOT MERGE
            CanonicalMedicine(
                id="med_pcm_650",
                canonical_name="Paracetamol 650mg",
                generic_name="Paracetamol",
                strength="650mg",
                dosage_form="tablet",
                unit="tablets",
                essential=True,
                verification_status="VERIFIED"
            ),
            # 4. Clinical distinction guard: same drug, DIFFERENT STRENGTH (850mg vs 500mg) - MUST NOT MERGE
            CanonicalMedicine(
                id="med_metformin_850",
                canonical_name="Metformin 850mg",
                generic_name="Metformin",
                strength="850mg",
                dosage_form="tablet",
                unit="tablets",
                essential=True,
                verification_status="VERIFIED"
            ),
        ]
        for dcm in dup_showcase:
            session.add(dcm)

        # Seed Aliases
        aliases = [
            ("med_pcm", "Crocin 500", "crocin 500", "BRAND"),
            ("med_pcm", "Calpol 500", "calpol 500", "BRAND"),
            ("med_pcm", "Dolo 500", "dolo 500", "BRAND"),
            ("med_pcm_syr", "Calpol Peadiatric Syrup", "calpol peadiatric syrup", "BRAND"),
            ("med_amox", "Mox 250", "mox 250", "BRAND"),
            ("med_ors", "Electral Oral Sachet", "electral oral sachet", "BRAND"),
            ("med_pcm_dup", "Paracetamol Generic 500", "paracetamol generic 500", "GENERIC"),
            ("med_amox_dup", "Amox 250 Cap", "amox 250 cap", "SHORT_NAME"),
            ("med_pcm_650", "Dolo 650", "dolo 650", "BRAND"),
            ("med_metformin_850", "Glycomet 850", "glycomet 850", "BRAND"),
        ]
        for mid, alias, norm_alias, atype in aliases:
            ma = MedicineAlias(medicine_id=mid, alias=alias, normalized_alias=norm_alias, alias_type=atype)
            session.add(ma)

        print("Creating Users for All 7 Roles...")
        pw_hash = hash_password("demo123")
        users = [
            User(id="user_patient", username="patient_demo", name="Senthil Kumar (Patient)", email="patient@demo.tn.gov.in", password_hash=pw_hash, role="patient"),
            User(id="user_pharma", username="pharma_demo", name="Suresh Pharmacist (Valparai Medical Store)", email="pharmacist@demo.tn.gov.in", password_hash=pw_hash, role="pharmacist", centre_id=None),
            User(id="user_phc", username="phc_demo", name="Murugan (PHC Pharmacist, Valparai)", email="phc@demo.tn.gov.in", password_hash=pw_hash, role="facility", centre_id="phc_valparai"),
            User(id="user_chc", username="chc_demo", name="Dr. Anitha (Medical Officer, CHC Pollachi)", email="chc@demo.tn.gov.in", password_hash=pw_hash, role="chc_facility", centre_id="chc_pollachi"),
            User(id="user_district", username="district_demo", name="Dr. Rajesh (District Health Officer, Coimbatore)", email="district@demo.tn.gov.in", password_hash=pw_hash, role="district_officer", centre_id=None),
            User(id="user_state", username="state_demo", name="Dr. Meenakshi (State Health Officer, Tamil Nadu)", email="state@demo.tn.gov.in", password_hash=pw_hash, role="state_officer", centre_id=None),
            User(id="user_national", username="national_demo", name="Dr. V. K. Paul (National Health Mission)", email="national@demo.tn.gov.in", password_hash=pw_hash, role="national_officer", centre_id=None),
            # Legacy users
            User(id="user_pharm_valparai", username="suresh_pharmacist", name="Suresh (Pharmacist, Valparai)", email="suresh@phc.valparai.gov.in", password_hash=pw_hash, role="facility", centre_id="phc_valparai"),
            User(id="user_block_anaimalai", username="dr_kavitha_bho", name="Dr. Kavitha (Block Health Officer)", email="kavitha@bho.anaimalai.gov.in", password_hash=pw_hash, role="block_officer", centre_id=None),
            User(id="user_dist_cbe", username="dr_rajesh_ddhs", name="Dr. Rajesh (DDHS)", email="rajesh@ddhs.cbe.gov.in", password_hash=pw_hash, role="district_officer", centre_id=None),
        ]
        for u in users:
            session.add(u)

        scopes = [
            UserScope(user_id="user_patient", state_id="TN", district_id="coimbatore"),
            UserScope(user_id="user_pharma", state_id="TN", district_id="coimbatore", pharmacy_id="pharma_valparai_01"),
            UserScope(user_id="user_phc", state_id="TN", district_id="coimbatore", facility_id="phc_valparai"),
            UserScope(user_id="user_chc", state_id="TN", district_id="coimbatore", facility_id="chc_pollachi"),
            UserScope(user_id="user_district", state_id="TN", district_id="coimbatore"),
            UserScope(user_id="user_state", state_id="TN"),
            UserScope(user_id="user_national"),
            UserScope(user_id="user_pharm_valparai", state_id="TN", district_id="coimbatore", facility_id="phc_valparai"),
        ]
        for sc in scopes:
            session.add(sc)

        # Seed Supply Parameters
        today = date.today()
        next_indent = today + timedelta(days=9)
        for c in centres:
            for m in medicines:
                sp = SupplyParam(
                    centre_id=c.id,
                    medicine_id=m.id,
                    lead_time_days=5,
                    next_indent_date=next_indent.isoformat(),
                    indent_cycle_days=30
                )
                session.add(sp)

        # Seed Daily Patient OPD load
        start_date = today - timedelta(days=90)
        for day_idx in range(91):
            d = (start_date + timedelta(days=day_idx)).isoformat()
            for c in centres:
                dp = DailyPatient(
                    centre_id=c.id,
                    date=d,
                    count=random.randint(65, 110)
                )
                session.add(dp)

        print("Generating 90-day transactions and planted scenarios...")
        # Scenario configurations:
        # 1. Planted Paracetamol Syrup spike at PHC Valparai
        for c in centres:
            for m in medicines:
                if c.id == "phc_valparai" and m.id == "med_pcm":
                    base_mean = 20
                    stock = 80
                elif c.id == "phc_aliyar" and m.id == "med_pcm":
                    base_mean = 3
                    stock = 350
                elif c.id == "phc_valparai" and m.id == "med_pcm_syr":
                    base_mean = 14
                    stock = 35 # Critical shortage
                elif c.id == "phc_aliyar" and m.id == "med_pcm_syr":
                    base_mean = 10
                    stock = 420 # Surplus donor!
                elif c.id == "phc_valparai" and m.id == "med_asv":
                    base_mean = 2
                    stock = 3 # CRITICAL shortage (only 3 vials ASV in snake bite plantation season)
                elif c.id == "chc_pollachi" and m.id == "med_asv":
                    base_mean = 1
                    stock = 36 # SURPLUS donor for ASV (36 vials)
                elif c.id == "phc_anaimalai" and m.id == "med_arv":
                    base_mean = 3
                    stock = 8 # HIGH shortage of Rabies vaccine
                elif c.id == "chc_pollachi" and m.id == "med_arv":
                    base_mean = 1
                    stock = 55 # SURPLUS donor for ARV
                elif c.id == "phc_samathur" and m.id == "med_pcm_syr":
                    base_mean = 12
                    stock = 280 # Alternative donor!
                elif c.id == "phc_anaimalai" and m.id == "med_ors":
                    base_mean = 35
                    stock = 110 # High tier
                elif c.id == "phc_valparai" and m.id == "med_salbutamol":
                    base_mean = 4
                    stock = 14 # WATCH tier inhaler
                elif c.id == "phc_aliyar" and m.id == "med_salbutamol":
                    base_mean = 2
                    stock = 75 # Surplus donor inhalers
                elif c.id == "phc_pollachi_rural" and m.id == "med_atropine":
                    base_mean = 3
                    stock = 9 # Critical emergency antidote
                elif c.id == "chc_pollachi" and m.id == "med_atropine":
                    base_mean = 1
                    stock = 60 # Surplus donor atropine
                elif c.is_stale:
                    base_mean = 15
                    stock = 90
                else:
                    base_mean = random.randint(12, 28)
                    stock = random.randint(220, 600)

                # Legacy StockLevel
                sl = StockLevel(
                    centre_id=c.id,
                    medicine_id=m.id,
                    current_stock=stock,
                    updated_at=datetime.now(timezone.utc) - timedelta(days=4 if c.is_stale else 0)
                )
                session.add(sl)

                # Multi-owner InventoryBalance (Facility)
                ib = InventoryBalance(
                    owner_type="facility",
                    owner_id=c.id,
                    medicine_id=m.id,
                    quantity_on_hand=stock,
                    last_verified_at=datetime.now(timezone.utc) - timedelta(days=4 if c.is_stale else 0)
                )
                session.add(ib)

                # Planted near-expiry dates for showcase
                batch_exp = "2027-12-31"
                if c.id == "phc_valparai" and m.id == "med_pcm":
                    batch_exp = (today + timedelta(days=19)).isoformat() # Near-expiry alert in 19 days!
                elif c.id == "phc_anaimalai" and m.id == "med_amox":
                    batch_exp = (today + timedelta(days=34)).isoformat() # Near-expiry alert in 34 days!
                elif c.id == "phc_aliyar" and m.id == "med_ors":
                    batch_exp = (today + timedelta(days=62)).isoformat() # Near-expiry alert in 62 days!

                # Batch
                mb = MedicineBatch(
                    owner_type="facility",
                    owner_id=c.id,
                    medicine_id=m.id,
                    batch_number=f"BTH-{c.id[:4].upper()}-{m.id[-3:].upper()}",
                    expiry_date=batch_exp,
                    received_quantity=stock + 50,
                    current_quantity=stock,
                    supplier_name="TN Medical Services Corp"
                )
                session.add(mb)

                # Generate 90 daily dispensing transactions
                for day_idx in range(90):
                    tx_date = start_date + timedelta(days=day_idx)
                    is_recent_3d = day_idx >= 87
                    dow = tx_date.weekday()
                    mult = 1.25 if dow in (0, 1) else (0.4 if dow == 6 else 1.0)

                    if c.id == "phc_valparai" and m.id == "med_pcm_syr" and is_recent_3d:
                        qty = int(base_mean * mult * 1.64) # +64% fever surge
                    else:
                        qty = max(1, int(random.gauss(base_mean, 2.5) * mult))

                    tx = Transaction(
                        centre_id=c.id,
                        medicine_id=m.id,
                        type="dispense",
                        qty=qty,
                        batch=f"BTH-{c.id[:4].upper()}-{m.id[-3:].upper()}",
                        expiry="2027-12-31",
                        ts=datetime.combine(tx_date, datetime.min.time(), tzinfo=timezone.utc) + timedelta(hours=10),
                        user="PHC Pharmacist"
                    )
                    session.add(tx)

        # Seed Pharmacy Inventory Balances (Apollo, MedPlus, Thulasi, etc.)
        for pid, _, _, _, _, _, _, _, _ in pharmacies_data:
            for mid, _, _, _, _, _, _, _ in medicines_data:
                p_qty = random.randint(25, 85)
                batch_exp = "2028-06-30"

                if pid == "pharma_valparai_01":
                    if mid == "med_atropine":
                        p_qty = 0 # Zero stock showcase!
                    elif mid == "med_salbutamol":
                        p_qty = 14
                        batch_exp = (today + timedelta(days=18)).isoformat() # Near-expiry warning (18 days)
                    elif mid == "med_pcm_syr":
                        p_qty = 18
                        batch_exp = (today + timedelta(days=45)).isoformat() # Near-expiry warning (45 days)
                    elif mid == "med_amox":
                        p_qty = 60
                    elif mid == "med_pcm":
                        p_qty = 45
                    elif mid == "med_ors":
                        p_qty = 120
                elif pid == "pharma_apollo_cbe" and mid == "med_pcm":
                    p_qty = 40
                elif pid == "pharma_medplus_rs_puram" and mid == "med_pcm":
                    p_qty = 25
                elif pid == "pharma_kovai_valparai" and mid == "med_pcm_syr":
                    p_qty = 15

                pib = InventoryBalance(
                    owner_type="pharmacy",
                    owner_id=pid,
                    medicine_id=mid,
                    quantity_on_hand=p_qty
                )
                session.add(pib)

                pmb = MedicineBatch(
                    owner_type="pharmacy",
                    owner_id=pid,
                    medicine_id=mid,
                    batch_number=f"BTH-{pid[:6].upper()}-{mid[-3:].upper()}",
                    expiry_date=batch_exp,
                    received_quantity=p_qty + 20,
                    current_quantity=p_qty,
                    supplier_name="Authorized Distributor"
                )
                session.add(pmb)

        # Seed Availability Enquiries
        enq1 = AvailabilityEnquiry(
            pharmacy_id="pharma_apollo_cbe",
            medicine_id="med_pcm",
            patient_name="Senthil Kumar",
            patient_phone="+91 98421 11223",
            requested_quantity=2,
            status="CONFIRMED",
            confirmed_by="K. Ramesh"
        )
        enq2 = AvailabilityEnquiry(
            pharmacy_id="pharma_kovai_valparai",
            medicine_id="med_pcm_syr",
            patient_name="Murugan (Tea Worker)",
            patient_phone="+91 94431 88771",
            requested_quantity=1,
            status="PENDING"
        )
        session.add(enq1)
        session.add(enq2)

        # Seed Initial Transfer Orders demonstrating full lifecycle & officer escalation
        to1 = TransferOrder(
            transfer_reference="TRF-VAL-ALI-01",
            from_owner_type="facility",
            from_owner_id="phc_aliyar",
            to_owner_type="facility",
            to_owner_id="phc_valparai",
            medicine_id="med_pcm_syr",
            quantity=80,
            distance_km=8.8,
            transit_minutes=22,
            status="REQUESTED",
            created_by="Suresh (Pharmacist, Valparai)",
            notes="Emergency stock transfer for pediatric fever surge"
        )
        to2 = TransferOrder(
            transfer_reference="TRF-AUTO-OFFER-02",
            from_owner_type="pharmacy",
            from_owner_id="pharma_valparai_01",
            to_owner_type="facility",
            to_owner_id="phc_valparai",
            medicine_id="med_pcm",
            quantity=150,
            distance_km=1.2,
            transit_minutes=8,
            status="OFFERED",
            urgency_level="CRITICAL",
            request_level="TOWN",
            escalation_level="PHARMACY",
            current_owner_role="pharmacist",
            contacted_suppliers_json='["pharma_valparai_01"]',
            created_by="Smart Redistribution Engine",
            notes="Automated tier-1 offer to local retail pharmacy"
        )
        to3 = TransferOrder(
            transfer_reference="TRF-RESERVED-03",
            from_owner_type="facility",
            from_owner_id="phc_pollachi_rural",
            to_owner_type="facility",
            to_owner_id="phc_valparai",
            medicine_id="med_asv",
            quantity=5,
            distance_km=32.4,
            transit_minutes=55,
            status="RESERVED",
            urgency_level="CRITICAL",
            request_level="DISTRICT",
            escalation_level="DISTRICT",
            stock_reserved=True,
            current_owner_role="district_officer",
            created_by="Dr. Rajesh (District Health Officer)",
            notes="Anti-Snake Venom emergency transfer. Stock reserved atomically in inventory balance."
        )
        to4 = TransferOrder(
            transfer_reference="TRF-ESCALATED-04",
            from_owner_type="facility",
            from_owner_id="phc_ettimadai",
            to_owner_type="facility",
            to_owner_id="phc_valparai",
            medicine_id="med_amox",
            quantity=200,
            distance_km=48.2,
            transit_minutes=70,
            status="ESCALATED",
            urgency_level="HIGH",
            request_level="DISTRICT",
            escalation_level="DISTRICT",
            current_owner_role="district_officer",
            requires_officer_approval=True,
            contacted_suppliers_json='["pharma_valparai_01", "pharma_valparai_02", "phc_aliyar"]',
            rejection_reasons_json='["pharma_valparai_01: Insufficient surplus", "phc_aliyar: Stock reserved for local camp"]',
            created_by="Smart Redistribution Engine",
            notes="Town-level search exhausted. Escalation dossier generated for District Health Officer review."
        )
        session.add(to1)
        session.add(to2)
        session.add(to3)
        session.add(to4)

        # Seed Verified Clinical Drug Monographs (MedicineInfo)
        med_infos = [
            MedicineInfo(
                id="med_pcm",
                canonical_id="med_pcm",
                generic_name="Paracetamol",
                brand_names="Crocin, Dolo-650, Calpol, Pacimol",
                active_ingredients="Paracetamol IP",
                strength="500mg",
                dosage_form="Tablet",
                route_of_administration="Oral",
                approved_indications="Analgesic and antipyretic for mild-to-moderate pain, headache, and reduction of pyrexia.",
                common_side_effects="Generally well-tolerated. Rare nausea, allergic skin reaction.",
                serious_warnings="Do not exceed maximum daily dosage of 4000mg. Caution in chronic alcoholism or pre-existing hepatic impairment.",
                contraindications="Severe active hepatic disease or acute liver failure.",
                drug_interactions="Enzyme inducers may increase toxicity risk. Prolonged regular use may enhance warfarin effect.",
                storage_instructions="Store below 30°C in a dry place protected from direct sunlight.",
                prescription_status="OTC",
                source="National Essential Drugs List (EDL) & CDSCO Formulary"
            ),
            MedicineInfo(
                id="med_pcm_syr",
                canonical_id="med_pcm_syr",
                generic_name="Paracetamol Pediatric Oral Suspension",
                brand_names="Calpol Peadiatric, Crocin 120, T-98",
                active_ingredients="Paracetamol IP 120mg/5ml",
                strength="120mg/5ml",
                dosage_form="Syrup",
                route_of_administration="Oral",
                approved_indications="Pediatric relief of mild to moderate pain and febrile conditions including post-immunization pyrexia.",
                common_side_effects="Occasional stomach upset.",
                serious_warnings="Always use a calibrated oral measuring syringe or measuring spoon. Do not use household teaspoons.",
                contraindications="Known hypersensitivity to paracetamol.",
                drug_interactions="Avoid concomitant use with other paracetamol-containing pediatric preparations.",
                storage_instructions="Store below 25°C. Do not freeze. Shake well before use.",
                prescription_status="OTC",
                source="National Essential Drugs List (EDL) & CDSCO Formulary"
            ),
            MedicineInfo(
                id="med_amox",
                canonical_id="med_amox",
                generic_name="Amoxicillin Trihydrate",
                brand_names="Mox 250, Novamox, Amoxil",
                active_ingredients="Amoxicillin Trihydrate IP equivalent to Amoxicillin 250mg",
                strength="250mg",
                dosage_form="Capsule",
                route_of_administration="Oral",
                approved_indications="Bacterial infections of the ear, nose, throat, respiratory tract, genitourinary tract, and skin.",
                common_side_effects="Diarrhea, nausea, vomiting, skin rashes.",
                serious_warnings="Severe allergic anaphylaxis possible in penicillin-sensitive patients. Complete the full prescribed course.",
                contraindications="History of severe penicillin or beta-lactam hypersensitivity.",
                drug_interactions="May reduce efficacy of oral contraceptives. Excretion reduced by probenecid.",
                storage_instructions="Store in airtight containers below 25°C in a dry place.",
                prescription_status="Rx",
                source="National Essential Drugs List (EDL) & CDSCO Formulary"
            ),
            MedicineInfo(
                id="med_metformin",
                canonical_id="med_metformin",
                generic_name="Metformin Hydrochloride",
                brand_names="Glycomet, Cetapin, Obimet",
                active_ingredients="Metformin Hydrochloride IP 500mg",
                strength="500mg",
                dosage_form="Tablet",
                route_of_administration="Oral",
                approved_indications="First-line pharmacotherapy for Type 2 Diabetes Mellitus in adults and children.",
                common_side_effects="Gastrointestinal distress, flatulence, abdominal pain, metallic taste.",
                serious_warnings="Risk of lactic acidosis during severe dehydration, sepsis, or acute renal impairment. Take with or after meals.",
                contraindications="Severe renal impairment (eGFR < 30 mL/min/1.73 m²), acute metabolic acidosis.",
                drug_interactions="Cationic drugs excreted via renal tubular secretion may interact. Contrast dye requires temporary cessation.",
                storage_instructions="Store protected from light and moisture below 30°C.",
                prescription_status="Rx",
                source="National Essential Drugs List (EDL) & CDSCO Formulary"
            ),
            MedicineInfo(
                id="med_amlodipine",
                canonical_id="med_amlodipine",
                generic_name="Amlodipine Besylate",
                brand_names="Amlong, Stamlo, Norvasc",
                active_ingredients="Amlodipine Besylate IP 5mg",
                strength="5mg",
                dosage_form="Tablet",
                route_of_administration="Oral",
                approved_indications="Essential hypertension, chronic stable angina, and vasospastic angina.",
                common_side_effects="Peripheral edema, headache, flushing, fatigue, dizziness.",
                serious_warnings="May cause severe hypotension in aortic stenosis. Dose titration required in severe hepatic dysfunction.",
                contraindications="Severe hypotension, cardiogenic shock.",
                drug_interactions="CYP3A4 inhibitors (e.g., ketoconazole) increase amlodipine concentration. May increase simvastatin levels.",
                storage_instructions="Store below 30°C protected from light.",
                prescription_status="Rx",
                source="National Essential Drugs List (EDL) & CDSCO Formulary"
            ),
            MedicineInfo(
                id="med_ors",
                canonical_id="med_ors",
                generic_name="Oral Rehydration Salts (WHO Formula)",
                brand_names="Electral, ORS-L, Walyte",
                active_ingredients="Sodium Chloride, Potassium Chloride, Sodium Citrate, Dextrose Anhydrous",
                strength="20.5g/sachet",
                dosage_form="Powder Sachet",
                route_of_administration="Oral",
                approved_indications="Prevention and treatment of clinical dehydration associated with acute diarrheal illness.",
                common_side_effects="Hypernatremia if prepared with insufficient water.",
                serious_warnings="Dissolve entire sachet in exactly 1 litre of clean drinking water. Discard unused reconstituted solution after 24 hours.",
                contraindications="Severe persistent vomiting, paralytic ileus, bowel perforation.",
                drug_interactions="None noted under recommended administration.",
                storage_instructions="Store in dry place below 30°C. Protect from moisture.",
                prescription_status="OTC",
                source="National Essential Drugs List (EDL) & WHO Model Formulary"
            ),
            MedicineInfo(
                id="med_asv",
                canonical_id="med_asv",
                generic_name="Anti-Snake Venom Polyvalent (Equine)",
                brand_names="ASV Serum, Polyvalent Antivenom",
                active_ingredients="Equine Immunoglobulin fragments neutralizing Cobra, Krait, Russell's Viper, and Saw-scaled Viper venoms",
                strength="10ml Vial",
                dosage_form="Injectable Solution",
                route_of_administration="Intravenous",
                approved_indications="Emergency neutralization of systemic envenomation from the 'Big Four' venomous Indian snakes.",
                common_side_effects="Anaphylaxis, pyrogenic chills, urticaria, serum sickness.",
                serious_warnings="Emergency resuscitation equipment including adrenaline (epinephrine 1:1000) must be immediately available at bedside.",
                contraindications="No absolute contraindication when life-threatening envenomation is present.",
                drug_interactions="Do not infuse simultaneously with incompatible colloidal solutions.",
                storage_instructions="Store in cold chain between 2°C and 8°C. Do not freeze.",
                prescription_status="Rx",
                source="National Essential Drugs List (EDL) & CDSCO National Guidelines"
            )
        ]
        for mi in med_infos:
            session.add(mi)

        # Seed Approved Pharmaceutical Suppliers
        suppliers = [
            Supplier(
                id="sup_tnmsc_cbe",
                supplier_name="Tamil Nadu Medical Services Corporation (TNMSC) District Depot",
                contact_person="Thiru. S. Murugesan (Depot Manager)",
                phone="+91 422 2244101",
                email="depot.cbe@tnmsc.gov.in",
                lead_time_days=3,
                license_number="TN/CBE/GOVT/2018/001",
                district_id="coimbatore",
                state_id="TN",
                is_approved=True
            ),
            Supplier(
                id="sup_kovai_pharma",
                supplier_name="Kovai Wholesale Pharma & Druggists Network",
                contact_person="Mr. K. R. Anand (Chief Logistics Officer)",
                phone="+91 94431 88200",
                email="orders@kovaipharma.com",
                lead_time_days=1,
                license_number="TN/CBE/DL/2021/4890",
                district_id="coimbatore",
                state_id="TN",
                is_approved=True
            ),
            Supplier(
                id="sup_south_india_life",
                supplier_name="South India Life Sciences Central Warehouse",
                contact_person="Ms. Lakshmi Narayanan (Institutional Head)",
                phone="+91 98410 55123",
                email="institutional@southindialife.in",
                lead_time_days=5,
                license_number="TN/CHE/MFG/2015/092",
                district_id="chennai",
                state_id="TN",
                is_approved=True
            )
        ]
        for sup in suppliers:
            session.add(sup)

        # Seed Purchase Orders
        pos = [
            PurchaseOrder(
                po_reference="PO-2026-TNMSC-001",
                owner_type="facility",
                owner_id="phc_valparai",
                supplier_id="sup_tnmsc_cbe",
                medicine_id="med_pcm",
                quantity=3000,
                unit_price=1.85,
                status="SUBMITTED",
                expected_delivery_date=(today + timedelta(days=3)).isoformat(),
                created_by="Murugan (PHC Pharmacist)"
            ),
            PurchaseOrder(
                po_reference="PO-2026-KOVAI-002",
                owner_type="pharmacy",
                owner_id="pharma_valparai_01",
                supplier_id="sup_kovai_pharma",
                medicine_id="med_asv",
                quantity=20,
                unit_price=450.00,
                status="IN_TRANSIT",
                expected_delivery_date=(today + timedelta(days=1)).isoformat(),
                created_by="Suresh Pharmacist"
            )
        ]
        for po in pos:
            session.add(po)

        # Seed Patient Medication Schedules & Logs for patient_demo
        sched1 = MedicationSchedule(
            id="sched_metformin_01",
            patient_id="user_patient",
            medicine_name="Metformin Hydrochloride 500mg",
            strength="500mg",
            dosage_form="Tablet",
            dose_quantity="1 tablet",
            frequency_per_day=2,
            schedule_times_json='["08:00", "20:00"]',
            start_date=(today - timedelta(days=14)).isoformat(),
            end_date=(today + timedelta(days=76)).isoformat(),
            prescribed_instructions="Take with water immediately after breakfast and dinner",
            doctor_name="Dr. Priya Raman, MBBS, MD",
            status="ACTIVE"
        )
        sched2 = MedicationSchedule(
            id="sched_amlodipine_02",
            patient_id="user_patient",
            medicine_name="Amlodipine Besylate 5mg",
            strength="5mg",
            dosage_form="Tablet",
            dose_quantity="1 tablet",
            frequency_per_day=1,
            schedule_times_json='["09:00"]',
            start_date=(today - timedelta(days=14)).isoformat(),
            end_date=(today + timedelta(days=76)).isoformat(),
            prescribed_instructions="Take 1 tablet every morning",
            doctor_name="Dr. Priya Raman, MBBS, MD",
            status="ACTIVE"
        )
        session.add(sched1)
        session.add(sched2)

        # Seed 7-day adherence logs
        for d_offset in range(1, 8):
            log_date = (today - timedelta(days=d_offset)).isoformat()
            session.add(MedicationReminderLog(
                schedule_id="sched_metformin_01",
                patient_id="user_patient",
                scheduled_time=f"{log_date} 08:00",
                action="TAKEN",
                action_timestamp=datetime.now(timezone.utc) - timedelta(days=d_offset, hours=15),
                notes="Taken on time"
            ))
            session.add(MedicationReminderLog(
                schedule_id="sched_metformin_01",
                patient_id="user_patient",
                scheduled_time=f"{log_date} 20:00",
                action="TAKEN" if d_offset != 3 else "SNOOZED",
                action_timestamp=datetime.now(timezone.utc) - timedelta(days=d_offset, hours=3),
                notes="Taken with dinner" if d_offset != 3 else "Delayed 30 mins"
            ))
            session.add(MedicationReminderLog(
                schedule_id="sched_amlodipine_02",
                patient_id="user_patient",
                scheduled_time=f"{log_date} 09:00",
                action="TAKEN",
                action_timestamp=datetime.now(timezone.utc) - timedelta(days=d_offset, hours=14),
                notes="Taken on time"
            ))

        # Today's morning dose taken!
        session.add(MedicationReminderLog(
            schedule_id="sched_metformin_01",
            patient_id="user_patient",
            scheduled_time=f"{today.isoformat()} 08:00",
            action="TAKEN",
            action_timestamp=datetime.now(timezone.utc) - timedelta(hours=2),
            notes="Morning dose confirmed"
        ))

        # Seed Notifications across roles
        notifs = [
            Notification(
                user_id="user_patient",
                target_role="patient",
                title="Medication Reminder: Evening Dose Due",
                message="Please take your scheduled Metformin 500mg tablet after dinner (20:00).",
                category="REMINDER",
                priority="INFO",
                is_read=False
            ),
            Notification(
                target_role="pharmacist",
                title="Low Stock Alert: Paracetamol 500mg",
                message="PHC Valparai stock has dropped to 80 units (2.1 days of cover). Redistribution recommended.",
                category="STOCK_ALERT",
                priority="CRITICAL",
                is_read=False,
                action_link="/transfers"
            ),
            Notification(
                target_role="facility",
                title="Incoming Transfer Offer TRF-AUTO-OFFER-02",
                message="Valparai Medical Store offered 150 units of Paracetamol 500mg. Please accept or reject.",
                category="TRANSFER_OFFER",
                priority="WARNING",
                is_read=False,
                action_link="/transfers"
            ),
            Notification(
                target_role="district_officer",
                title="Shortage Escalation: Amoxicillin at Valparai",
                message="Hierarchical transfer TRF-ESCALATED-04 requires District Health Officer approval. Local suppliers exhausted.",
                category="ESCALATION",
                priority="CRITICAL",
                is_read=False,
                action_link="/transfers"
            ),
            Notification(
                target_role="state_officer",
                title="Monsoon Preparedness: Western Ghats Cluster",
                message="Monsoon fever surge detected across 3 Coimbatore hill sub-centres. Buffer stocks reviewed.",
                category="STOCK_ALERT",
                priority="INFO",
                is_read=True
            ),
            Notification(
                target_role="national_officer",
                title="National Essential Drug Index Update",
                message="Tamil Nadu reports 96.8% essential medicine availability index across primary health facilities.",
                category="SYSTEM",
                priority="INFO",
                is_read=True
            )
        ]
        for n in notifs:
            session.add(n)

        session.commit()

        print("Computing early-warning forecasts and alerts...")
        today = date.today()
        start_date = today - timedelta(days=90)
        for c in centres:
            for m in medicines:
                # Query daily consumption series
                txs = session.exec(select(Transaction).where(
                    (Transaction.centre_id == c.id) &
                    (Transaction.medicine_id == m.id) &
                    (Transaction.type == "dispense")
                )).all()

                tx_list = [{"type": "dispense", "qty": t.qty, "ts": t.ts.isoformat()} for t in txs]
                dates, series = build_daily_series(tx_list, start_date, today)
                ewma_series = compute_ewma(series, alpha=0.3)
                velocity = float(ewma_series[-1]) if len(ewma_series) > 0 else 1.0
                trend, pct_change = compute_trend(series)
                spike_detected, spike_date = detect_cusum(series, dates)

                sl = session.exec(select(StockLevel).where((StockLevel.centre_id == c.id) & (StockLevel.medicine_id == m.id))).first()
                stock = sl.current_stock if sl else 100

                sp = session.exec(select(SupplyParam).where((SupplyParam.centre_id == c.id) & (SupplyParam.medicine_id == m.id))).first()
                lead_time = sp.lead_time_days if sp else 5
                next_indent_date = datetime.fromisoformat(sp.next_indent_date).date() if sp else (today + timedelta(days=9))
                days_to_indent = (next_indent_date - today).days
                action_window = days_to_indent + lead_time

                mc = monte_carlo_forecast(
                    current_stock=stock,
                    velocity=velocity,
                    trend=trend,
                    recent_series=series,
                    action_window_days=action_window,
                    ref_date=today,
                    num_runs=2000,
                    seed=42
                )

                tier = assign_tier(mc["p_stockout"], is_essential=m.essential, is_stale=c.is_stale)
                
                p10_d = datetime.fromisoformat(mc["p10_date"]).date()
                latest_safe_action = p10_d - timedelta(days=lead_time)
                days_to_latest_action = (latest_safe_action - today).days

                urgency = compute_urgency(
                    p_stockout=mc["p_stockout"],
                    days_to_latest_action=days_to_latest_action,
                    trend=trend,
                    is_essential=m.essential,
                    daily_patients=80
                )

                order_qty = compute_recommended_order(
                    velocity=velocity,
                    current_stock=stock,
                    days_to_next_indent=days_to_indent,
                    lead_time_days=lead_time,
                    indent_cycle_days=30,
                    safety_days=m.safety_days
                )

                patient_impact = compute_patient_impact(
                    days_of_cover=mc["days_of_cover"],
                    action_window_days=action_window,
                    daily_patients=80
                )

                reason_en, reason_ta = generate_explanations(
                    pct_change=pct_change,
                    spike_detected=spike_detected,
                    spike_date_str=spike_date,
                    days_of_cover=mc["days_of_cover"],
                    days_to_next_indent=days_to_indent,
                    lead_time_days=lead_time,
                    p_stockout=mc["p_stockout"]
                )

                alert = Alert(
                    centre_id=c.id,
                    medicine_id=m.id,
                    tier=tier,
                    urgency=urgency,
                    probability=mc["p_stockout"],
                    predicted_date=mc["p50_date"],
                    range_low=mc["p10_date"],
                    range_high=mc["p90_date"],
                    latest_safe_action_date=latest_safe_action.isoformat(),
                    days_of_cover=mc["days_of_cover"],
                    velocity=round(velocity, 2),
                    trend=round(trend, 2),
                    trend_pct=round(pct_change, 1),
                    recommended_order_qty=order_qty,
                    patient_impact=patient_impact,
                    reason=reason_en,
                    reason_ta=reason_ta,
                    status="NEW"
                )
                session.add(alert)

                if tier == "CRITICAL":
                    if c.id == "phc_valparai" and m.id == "med_pcm":
                        session.add(AlertEvent(
                            alert_id=alert.id,
                            action="ALERT_TRIGGERED",
                            timestamp=datetime.now(timezone.utc) - timedelta(hours=3),
                            user="System Early Warning",
                            notes=f"Viral fever cluster detected. Daily dispensing increased by {abs(round(pct_change))}%."
                        ))
                        session.add(AlertEvent(
                            alert_id=alert.id,
                            action="ACKNOWLEDGED",
                            timestamp=datetime.now(timezone.utc) - timedelta(hours=2, minutes=15),
                            user="Dr. Rajesh (DDHS Coimbatore)",
                            notes="Medical Officer acknowledged. Reviewing inter-facility transfers from PHC Aliyar."
                        ))
                        session.add(AlertEvent(
                            alert_id=alert.id,
                            action="TRANSFER_APPROVED",
                            timestamp=datetime.now(timezone.utc) - timedelta(hours=1, minutes=30),
                            user="Dr. Rajesh (DDHS Coimbatore)",
                            notes="Approved bilateral transfer of 262 tablets from PHC Aliyar."
                        ))
                        session.add(AlertEvent(
                            alert_id=alert.id,
                            action="DISPATCHED_SMS",
                            timestamp=datetime.now(timezone.utc) - timedelta(minutes=45),
                            user="Automated Dispatch Gateway",
                            notes="SMS alert dispatched to Valparai MO and courier transport."
                        ))
                    elif c.id == "phc_valparai" and m.id == "med_asv":
                        session.add(AlertEvent(
                            alert_id=alert.id,
                            action="ALERT_TRIGGERED",
                            timestamp=datetime.now(timezone.utc) - timedelta(hours=2),
                            user="System Early Warning",
                            notes="Critical risk: Only 3 vials Anti-Snake Venom left during monsoon plantation season."
                        ))
                        session.add(AlertEvent(
                            alert_id=alert.id,
                            action="ACKNOWLEDGED",
                            timestamp=datetime.now(timezone.utc) - timedelta(hours=1, minutes=10),
                            user="Dr. Rajesh (DDHS Coimbatore)",
                            notes="Prioritized emergency replenishment from CHC Pollachi."
                        ))
                    else:
                        event = AlertEvent(
                            alert_id=alert.id,
                            action="ALERT_TRIGGERED",
                            timestamp=datetime.now(timezone.utc) - timedelta(hours=2),
                            user="System Early Warning",
                            notes=f"Surge detected. Consumption up {abs(round(pct_change))}%."
                        )
                        session.add(event)

        session.commit()
        print("[OK] Deterministic seed data successfully created for all 6 roles, facilities, pharmacies, and medicines!")

seed_all = run_seed

if __name__ == "__main__":
    run_seed()
