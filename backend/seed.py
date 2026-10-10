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
    TransferOrder, AvailabilityEnquiry, AuditLog
)
from backend.forecast import (
    build_daily_series, compute_ewma, compute_trend, detect_cusum,
    monte_carlo_forecast, assign_tier, compute_urgency,
    compute_recommended_order, compute_patient_impact, generate_explanations
)
from backend.app.auth import hash_password

def run_seed():
    random.seed(42)
    init_db()

    with Session(engine) as session:
        # Clear existing tables cleanly
        all_models = [
            AlertEvent, Alert, Transaction, StockLevel, SupplyParam, DailyPatient,
            UserScope, User, Centre, Medicine, CanonicalMedicine, MedicineAlias,
            Facility, Pharmacy, InventoryBalance, MedicineBatch, InventoryTransaction,
            TransferOrder, AvailabilityEnquiry, AuditLog
        ]
        for model in all_models:
            objs = session.exec(select(model)).all()
            for obj in objs:
                session.delete(obj)
        session.commit()
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

        print("Creating Users for All 6 Roles...")
        pw_hash = hash_password("demo123")
        users = [
            User(id="user_patient", username="patient_demo", name="Senthil Kumar (Patient)", email="patient@demo.tn.gov.in", password_hash=pw_hash, role="patient"),
            User(id="user_pharma", username="pharma_demo", name="K. Ramesh (Pharmacist)", email="pharmacist@demo.tn.gov.in", password_hash=pw_hash, role="pharmacist", centre_id=None),
            User(id="user_chc", username="chc_demo", name="Dr. Anitha (Medical Officer, CHC Pollachi)", email="chc@demo.tn.gov.in", password_hash=pw_hash, role="chc_facility", centre_id="chc_pollachi"),
            User(id="user_district", username="district_demo", name="Dr. Rajesh (District Health Officer, Coimbatore)", email="district@demo.tn.gov.in", password_hash=pw_hash, role="district_officer", centre_id=None),
            User(id="user_state", username="state_demo", name="Dr. Meenakshi (State Health Officer, Tamil Nadu)", email="state@demo.tn.gov.in", password_hash=pw_hash, role="state_officer", centre_id=None),
            User(id="user_national", username="national_demo", name="Dr. V. K. Paul (National Health Mission)", email="national@demo.tn.gov.in", password_hash=pw_hash, role="national_officer", centre_id=None),
            # Legacy users
            User(id="user_pharm_valparai", username="suresh_pharmacist", name="Suresh (Pharmacist, Valparai)", email="suresh@phc.valparai.gov.in", password_hash=pw_hash, role="pharmacist", centre_id="phc_valparai"),
            User(id="user_block_anaimalai", username="dr_kavitha_bho", name="Dr. Kavitha (Block Health Officer)", email="kavitha@bho.anaimalai.gov.in", password_hash=pw_hash, role="block_officer", centre_id=None),
            User(id="user_dist_cbe", username="dr_rajesh_ddhs", name="Dr. Rajesh (DDHS)", email="rajesh@ddhs.cbe.gov.in", password_hash=pw_hash, role="district_officer", centre_id=None),
        ]
        for u in users:
            session.add(u)

        scopes = [
            UserScope(user_id="user_patient", state_id="TN", district_id="coimbatore"),
            UserScope(user_id="user_pharma", state_id="TN", district_id="coimbatore", pharmacy_id="pharma_apollo_cbe"),
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
                p_qty = random.randint(20, 85)
                # Apollo has 40 strips PCM, MedPlus has 25 strips PCM
                if pid == "pharma_apollo_cbe" and mid == "med_pcm":
                    p_qty = 40
                elif pid == "pharma_medplus_rs_puram" and mid == "med_pcm":
                    p_qty = 25
                elif pid == "pharma_valparai_hill" and mid == "med_pcm_syr":
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
                    batch_number=f"BTH-RETAIL-{mid[:6].upper()}",
                    expiry_date="2028-06-30",
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

        # Seed Initial Transfer Order
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
        session.add(to1)

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

if __name__ == "__main__":
    run_seed()
