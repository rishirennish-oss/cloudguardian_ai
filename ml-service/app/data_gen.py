import numpy as np
import pandas as pd

FEATURE_NAMES = [
    "cpuUsage",
    "memoryUsage",
    "diskUsage",
    "networkIn",
    "networkOut",
    "responseTimeMs",
    "errorRate",
    "requestsPerSec",
]

VALID_RANGES = {
    "cpuUsage": (0.0, 100.0),
    "memoryUsage": (0.0, 100.0),
    "diskUsage": (0.0, 100.0),
    "networkIn": (0.0, 1000.0),
    "networkOut": (0.0, 1000.0),
    "responseTimeMs": (20.0, 5000.0),
    "errorRate": (0.0, 100.0),
    "requestsPerSec": (0.0, 2000.0),
}

HEALTHY_RANGES = {
    "cpuUsage": (20.0, 45.0),
    "memoryUsage": (30.0, 55.0),
    "diskUsage": (40.0, 60.0),
    "networkIn": (100.0, 400.0),
    "networkOut": (80.0, 350.0),
    "responseTimeMs": (40.0, 200.0),
    "errorRate": (0.0, 2.0),
    "requestsPerSec": (50.0, 500.0),
}

# Healthy means and stds for feature contribution calculations
HEALTHY_MEANS = {k: (v[0] + v[1]) / 2.0 for k, v in HEALTHY_RANGES.items()}
HEALTHY_STDS = {k: max(1.0, (v[1] - v[0]) / 4.0) for k, v in HEALTHY_RANGES.items()}


def _generate_healthy_samples(n: int, rng: np.random.RandomState) -> dict:
    """Generate healthy metric samples uniformly inside healthy ranges with slight Gaussian noise."""
    data = {}
    for feat in FEATURE_NAMES:
        low, high = HEALTHY_RANGES[feat]
        base = rng.uniform(low, high, size=n)
        noise = rng.normal(0, (high - low) * 0.05, size=n)
        vals = base + noise
        min_val, max_val = VALID_RANGES[feat]
        data[feat] = np.clip(vals, min_val, max_val)
    return data


def generate_synthetic_data(n_samples: int = 20000, random_state: int = 42) -> pd.DataFrame:
    """
    Generate ~20,000 synthetic rows with classes:
    - none: ~60% (~12,000)
    - cpu_overload: ~8% (~1,600)
    - memory_leak: ~8% (~1,600)
    - disk_full: ~8% (~1,600)
    - network_congestion: ~8% (~1,600)
    - service_crash: ~8% (~1,600)
    For fault rows, sample alpha between healthy baseline and fault target to capture early-stage faults.
    """
    rng = np.random.RandomState(random_state)

    n_none = int(round(n_samples * 0.60))
    n_fault_each = int(round(n_samples * 0.08))
    # Adjust total if slight rounding difference
    n_total = n_none + n_fault_each * 5

    records = []

    # 1. Healthy ("none") rows
    healthy_dict = _generate_healthy_samples(n_none, rng)
    df_none = pd.DataFrame(healthy_dict)
    df_none["failureType"] = "none"
    records.append(df_none)

    # Helper for generating fault rows with interpolation factor alpha
    def make_fault_df(fault_type: str, n: int, modify_fn) -> pd.DataFrame:
        base = _generate_healthy_samples(n, rng)
        # alpha in [0.20, 1.0] to capture early-stage through full fault
        alpha = rng.uniform(0.20, 1.0, size=n)
        modify_fn(base, alpha, rng, n)
        # Ensure clipping to valid ranges
        for feat in FEATURE_NAMES:
            min_val, max_val = VALID_RANGES[feat]
            base[feat] = np.clip(base[feat], min_val, max_val)
        df_fault = pd.DataFrame(base)
        df_fault["failureType"] = fault_type
        return df_fault

    # 2. cpu_overload: cpu->95, responseTimeMs->1500, requestsPerSec drops
    def mod_cpu_overload(b, a, r, n):
        target_cpu = 95.0 + r.normal(0, 2.0, size=n)
        target_resp = 1500.0 + r.normal(0, 50.0, size=n)
        target_req = 25.0 + r.normal(0, 5.0, size=n)
        b["cpuUsage"] = (1.0 - a) * b["cpuUsage"] + a * target_cpu
        b["responseTimeMs"] = (1.0 - a) * b["responseTimeMs"] + a * target_resp
        b["requestsPerSec"] = (1.0 - a) * b["requestsPerSec"] + a * target_req

    # 3. memory_leak: memory->97, responseTimeMs->900
    def mod_memory_leak(b, a, r, n):
        target_mem = 97.0 + r.normal(0, 1.5, size=n)
        target_resp = 900.0 + r.normal(0, 40.0, size=n)
        b["memoryUsage"] = (1.0 - a) * b["memoryUsage"] + a * target_mem
        b["responseTimeMs"] = (1.0 - a) * b["responseTimeMs"] + a * target_resp

    # 4. disk_full: disk->98, errorRate->10
    def mod_disk_full(b, a, r, n):
        target_disk = 98.0 + r.normal(0, 1.0, size=n)
        target_err = 10.0 + r.normal(0, 1.0, size=n)
        b["diskUsage"] = (1.0 - a) * b["diskUsage"] + a * target_disk
        b["errorRate"] = (1.0 - a) * b["errorRate"] + a * target_err

    # 5. network_congestion: networkIn/networkOut->900, responseTimeMs->1800, errorRate->12
    def mod_net_congestion(b, a, r, n):
        target_net_in = 900.0 + r.normal(0, 30.0, size=n)
        target_net_out = 900.0 + r.normal(0, 30.0, size=n)
        target_resp = 1800.0 + r.normal(0, 60.0, size=n)
        target_err = 12.0 + r.normal(0, 1.5, size=n)
        b["networkIn"] = (1.0 - a) * b["networkIn"] + a * target_net_in
        b["networkOut"] = (1.0 - a) * b["networkOut"] + a * target_net_out
        b["responseTimeMs"] = (1.0 - a) * b["responseTimeMs"] + a * target_resp
        b["errorRate"] = (1.0 - a) * b["errorRate"] + a * target_err

    # 6. service_crash: instant crash -> status down, cpu 0, requests 0, error 100, response 5000
    def mod_service_crash(b, a, r, n):
        b["cpuUsage"] = np.maximum(0.0, r.normal(0.5, 0.5, size=n))
        b["requestsPerSec"] = np.maximum(0.0, r.normal(0.5, 0.5, size=n))
        b["errorRate"] = np.minimum(100.0, 100.0 - np.abs(r.normal(0, 1.0, size=n)))
        b["responseTimeMs"] = np.minimum(5000.0, 5000.0 - np.abs(r.normal(0, 50.0, size=n)))

    records.append(make_fault_df("cpu_overload", n_fault_each, mod_cpu_overload))
    records.append(make_fault_df("memory_leak", n_fault_each, mod_memory_leak))
    records.append(make_fault_df("disk_full", n_fault_each, mod_disk_full))
    records.append(make_fault_df("network_congestion", n_fault_each, mod_net_congestion))
    records.append(make_fault_df("service_crash", n_fault_each, mod_service_crash))

    df = pd.concat(records, ignore_index=True)
    df = df.sample(frac=1.0, random_state=random_state).reset_index(drop=True)
    return df

