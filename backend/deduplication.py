import re
import difflib
from typing import Dict, Any, List, Optional, Tuple

ABBREVIATION_MAP = {
    r'\btab\b': 'tablet',
    r'\btabs\b': 'tablet',
    r'\btablets\b': 'tablet',
    r'\bcap\b': 'capsule',
    r'\bcaps\b': 'capsule',
    r'\bcapsules\b': 'capsule',
    r'\bsyr\b': 'syrup',
    r'\bsyrups\b': 'syrup',
    r'\binj\b': 'injection',
    r'\binjections\b': 'injection',
    r'\bsusp\b': 'suspension',
    r'\bsachet\b': 'sachet',
    r'\bsachets\b': 'sachet',
    r'\bm\.g\.\b': 'mg',
    r'\bmilligram\b': 'mg',
    r'\bmilligrams\b': 'mg',
    r'\bm\.l\.\b': 'ml',
    r'\bmillilitre\b': 'ml',
    r'\bmillilitres\b': 'ml',
}

def normalize_medicine_name(name: str) -> str:
    """
    Standardize medicine text:
    - Lowercase, strip whitespace, remove punctuation noise
    - Unify abbreviations (e.g. 'tab' -> 'tablet', '500 mg' -> '500mg')
    - Handle dot-delimited abbreviations like M.G. -> mg
    """
    if not name:
        return ""
    text = name.strip().lower()
    
    # Normalize dot-delimited unit abbreviations: m.g. -> mg, m.l. -> ml
    text = re.sub(r'm\s*\.\s*g\s*\.?', 'mg', text)
    text = re.sub(r'm\s*\.\s*l\s*\.?', 'ml', text)
    text = re.sub(r'mc\s*g', 'mcg', text)

    # Remove special punctuation like brackets, commas, quotes, dots
    text = re.sub(r'[\(\)\[\],;:"\'\*\+\.]', ' ', text)
    
    # Standardize spacing around numbers and units (e.g. '500 mg' -> '500mg')
    text = re.sub(r'(\d+)\s*(mg|ml|mcg|gm|g|iu)\b', r'\1\2', text)
    
    # Replace common medical abbreviations (word-boundary safe)
    for pattern, replacement in ABBREVIATION_MAP.items():
        # Skip m.g./m.l. patterns that were already handled above
        if r'm\.g\.' in pattern or r'm\.l\.' in pattern:
            continue
        text = re.sub(pattern, replacement, text)
    
    # Collapse multiple whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_strength_and_form(name: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract strength (e.g. '500mg') and dosage form (e.g. 'tablet')."""
    norm = normalize_medicine_name(name)
    
    # Find strength (e.g., 500mg, 650mg, 250mg, 60ml, 20.5g)
    strength_match = re.search(r'\b\d+(\.\d+)?(mg|ml|mcg|gm|g|iu)\b', norm)
    strength = strength_match.group(0) if strength_match else None
    
    # Find dosage form
    forms = ['tablet', 'capsule', 'syrup', 'suspension', 'injection', 'sachet', 'drops', 'ointment']
    dosage_form = None
    for f in forms:
        if re.search(rf'\b{f}\b', norm):
            dosage_form = f
            break
            
    return strength, dosage_form

def compute_similarity(str1: str, str2: str) -> float:
    """Compute string similarity ratio (0.0 to 1.0) using Gestalt pattern matching."""
    s1 = normalize_medicine_name(str1)
    s2 = normalize_medicine_name(str2)
    if s1 == s2:
        return 1.0
    return difflib.SequenceMatcher(None, s1, s2).ratio()

def detect_duplicate_candidate(
    candidate_name: str,
    candidate_strength: Optional[str],
    candidate_form: Optional[str],
    existing_records: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Evaluates candidate medicine against existing catalogue.
    Rules:
    1. Exact normalized match on name + strength + form -> MATCH_EXACT.
    2. Ingredient matches but strength or dosage form differs -> DIFFERENT_PRODUCT (NO MERGE).
    3. Similarity >= 0.85 with matching strength/form -> HIGH_SIMILARITY_WARNING.
    4. Similarity between 0.65 and 0.85 -> AMBIGUOUS_MATCH.
    5. Otherwise -> NO_DUPLICATE.
    """
    norm_candidate = normalize_medicine_name(candidate_name)
    cand_str, cand_form = extract_strength_and_form(candidate_name)
    
    final_strength = (candidate_strength or cand_str or "").lower().replace(" ", "")
    final_form = (candidate_form or cand_form or "").lower().strip()
    
    best_match = None
    highest_sim = 0.0
    
    for rec in existing_records:
        rec_name = rec.get("canonical_name") or rec.get("name", "")
        rec_str = (rec.get("strength") or "").lower().replace(" ", "")
        rec_form = (rec.get("dosage_form") or "").lower().strip()
        
        sim = compute_similarity(candidate_name, rec_name)
        if sim > highest_sim:
            highest_sim = sim
            best_match = rec

    if not best_match or highest_sim < 0.60:
        return {
            "status": "NO_DUPLICATE",
            "similarity": round(highest_sim, 3),
            "match": None,
            "can_auto_link": False
        }

    best_str = (best_match.get("strength") or "").lower().replace(" ", "")
    best_form = (best_match.get("dosage_form") or "").lower().strip()
    
    # RULE: Different strength or form must NEVER be merged!
    if final_strength and best_str and final_strength != best_str:
        return {
            "status": "DIFFERENT_PRODUCT",
            "reason": f"Strength mismatch: '{final_strength}' vs '{best_str}'. Distinct clinical entities.",
            "similarity": round(highest_sim, 3),
            "match": best_match,
            "can_auto_link": False
        }
        
    if final_form and best_form and final_form != best_form:
        return {
            "status": "DIFFERENT_PRODUCT",
            "reason": f"Dosage form mismatch: '{final_form}' vs '{best_form}'. Distinct clinical entities.",
            "similarity": round(highest_sim, 3),
            "match": best_match,
            "can_auto_link": False
        }

    # If identical normalized name
    if highest_sim >= 0.96 or norm_candidate == normalize_medicine_name(best_match.get("canonical_name", "")):
        return {
            "status": "MATCH_EXACT",
            "similarity": round(highest_sim, 3),
            "match": best_match,
            "can_auto_link": True
        }

    if highest_sim >= 0.85:
        return {
            "status": "HIGH_SIMILARITY_WARNING",
            "similarity": round(highest_sim, 3),
            "match": best_match,
            "can_auto_link": False,
            "action_required": "Human verification recommended before linking"
        }

    return {
        "status": "AMBIGUOUS_MATCH",
        "similarity": round(highest_sim, 3),
        "match": best_match,
        "can_auto_link": False,
        "action_required": "Requires pharmacist/officer catalogue review"
    }
