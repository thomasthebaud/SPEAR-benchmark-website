# SPEARBench Inference Helper

This folder contains a small helper pipeline for running model inference on the SPEAR Benchmark data before submitting outputs for evaluation.

## 1. Set Up the Environment

Create the conda environment from the provided file:

```bash
conda env create -f environment.yml
conda activate spearbench-inference
```

If you use a different environment name, adjust the activation command accordingly. The scripts assume they are run from this `inference_help_code/` directory.

The inference script also sources `openai_keys.sh`. For OpenAI-based examples, create that file locally:

```bash
cat > openai_keys.sh <<'EOF'
openai_api_key="YOUR_OPENAI_API_KEY"
org="YOUR_OPENAI_ORG_OR_EMPTY_STRING"
EOF
```

Do not commit `openai_keys.sh` or any API keys.

## 2. Prepare the Input Data

After downloading the benchmark data, unzip it and place the `dev` and `test` folders here:

```text
data/seamless_2t_2s_questions/inputs/dev/
data/seamless_2t_2s_questions/inputs/test/
```

In other words, the downloaded input data should live under:

```text
data/seamless_2t_2s_questions/inputs/
```

The scripts use this location through `config.sh`:

```bash
protocol="seamless_2t_2s_questions"
data_dir="data/$protocol"
```

## 3. Add Your Model to `config.sh`

Edit `config.sh` and set the model name you want to evaluate. The model name should match the proxy filename you add under `bin/llm_proxies/`.

For example, to evaluate `my_model_name`, use:

```bash
protocol="seamless_2t_2s_questions"
data_dir="data/$protocol"

llm_model="my_model_name"
```

## 4. Add a Model Proxy

Each model is connected to the benchmark by a Python proxy file in:

```text
bin/llm_proxies/
```

To add a model, create:

```text
bin/llm_proxies/my_model_name.py
```

The filename stem must match the model name in `config.sh`. The proxy is responsible for taking the benchmark input and producing the model response audio/metadata in the expected format.

Two example proxies are included:

- `bin/llm_proxies/gpt-audio-1.5.py`: example of a non-streaming model proxy.
- `bin/llm_proxies/gpt-realtime-2.py`: example of a streaming model proxy.

Running both OpenAI examples across the benchmark with an OpenAI key costs roughly $300, depending on pricing and retries. Use them as implementation references, and be careful before launching full evaluations.

## 5. Run Inference

Once the environment, input data, config, keys, and proxy are ready, run:

```bash
bash run_LLM_inference.sh
```

The script runs over both `dev` and `test`, and over the `improvised` and `naturalistic` subsets. It writes outputs to:

```text
data/seamless_2t_2s_questions/outputs/my_model_name/
```

Current script use a slurm type command requesting one gpu:

```bash
srun -p gpu --gpus 1 python bin/run_LLM_inference.py
```

Feel free to change it if needed.

## 6. Submit Outputs

After inference completes, zip the model output directory:

```bash
cd data/seamless_2t_2s_questions/outputs
zip -r my_model_name.zip my_model_name
```

Send `my_model_name.zip` to the SPEARBench team for evaluation. The archive should contain the generated audios and metadata for all required splits and subsets.
