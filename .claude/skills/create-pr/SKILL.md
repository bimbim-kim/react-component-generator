---
name: create-pr
description: |
  현재 브랜치의 커밋과 diff를 분석해 PR 제목과 본문을 작성하고 `gh`로 Pull Request를 생성한다.
  프로젝트 성격(해외 오픈소스 vs 한국 프로젝트)에 따라 영문 또는 한국어 템플릿을 골라 쓴다.
  "PR 만들어줘", "PR 생성", "풀리퀘스트 올려줘", "create pr", "open a pull request", "/create-pr" 같은 요청에 활성화한다.
  커밋이나 푸시 이야기 없이 "이 작업 올려줘", "리뷰 요청할 수 있게 해줘"처럼 말해도 PR 생성이 목적이면 이 스킬을 쓴다.
context: fork
argument-hint: "[--lang en|ko] [--base <브랜치>] [--draft] [PR에 담을 메모]"
---

# Create PR

현재 브랜치의 변경을 읽고 템플릿에 맞춰 PR을 만든다. 이 스킬은 `context: fork`로 서브 에이전트에서 실행되므로 부모 대화의 맥락이 없다. 필요한 정보는 모두 git과 `gh`로 직접 수집한다. 인자의 메모가 있으면 PR 본문의 배경 설명에 반영한다.

## 원칙

- 확인 질문 없이 끝까지 진행한다. 판단이 애매하면 보수적인 쪽(draft 아님, 기본 브랜치 대상)으로 정하고 결과 보고에 그 판단을 적는다.
- 본문은 diff와 커밋 로그에서 실제로 확인한 내용만 쓴다. 이유를 추측해 지어내지 않는다. 테스트 결과는 실제로 실행했거나 로그에서 확인한 것만 체크한다.
- 기본 브랜치(`main` 등)에서는 PR을 만들 수 없으므로 중단하고 알린다. 브랜치를 새로 만들거나 커밋을 대신 만드는 일은 범위 밖이다.
- 커밋되지 않은 변경이 있으면 PR에 포함되지 않는다는 점을 결과 보고에 적는다. 임의로 커밋하지 않는다.
- `--force` 푸시, `--no-verify`, 기존 PR 덮어쓰기는 사용자가 명시적으로 요청할 때만 쓴다.

## 절차

### 1. 상태 확인

```bash
git rev-parse --is-inside-work-tree
git branch --show-current
git status --short
gh auth status
gh repo view --json nameWithOwner,defaultBranchRef,description,primaryLanguage,owner
```

- 저장소가 아니거나 `gh` 인증이 없으면 중단하고 필요한 조치를 알린다.
- 대상(base) 브랜치는 `--base` 인자가 있으면 그것, 없으면 저장소 기본 브랜치다.
- 현재 브랜치가 base와 같으면 중단한다.
- 같은 head 브랜치로 열린 PR이 이미 있는지 확인한다(`gh pr list --head <브랜치> --state open`). 있으면 새로 만들지 않고 그 URL을 알린 뒤 끝낸다.

### 2. 변경 분석

```bash
git fetch origin <base> 2>/dev/null
git log --oneline origin/<base>..HEAD
git diff --stat origin/<base>...HEAD
git diff origin/<base>...HEAD
```

diff가 크면 파일별로 나눠 읽는다. 커밋 목록이 비어 있으면 PR로 올릴 변경이 없다고 알리고 끝낸다. 커밋 하나하나가 아니라 변경 전체가 무엇을 달성하는지를 기준으로 요약한다. 리뷰어가 가장 알고 싶은 것은 "무엇이 왜 바뀌었고 어디를 봐야 하는가"이기 때문이다.

### 3. 언어와 템플릿 결정

저장소 자체의 PR 템플릿이 있으면 그것이 최우선이다(`.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, `docs/`, 루트의 동일 파일명). 기여자가 지켜야 하는 프로젝트의 공식 형식이므로 이 스킬의 템플릿으로 덮어쓰지 않는다. 이 경우 그 템플릿의 구조와 언어를 따른다.

저장소 템플릿이 없으면 아래 순서로 언어를 판정한다. 위쪽 신호가 아래쪽보다 강하다.

1. 인자 `--lang en` 또는 `--lang ko`
2. 최근 PR 제목/본문의 언어: `gh pr list --state all --limit 10 --json title,body`
3. `README.md`, `CONTRIBUTING.md`의 주 언어
4. 최근 커밋 메시지의 주 언어(`git log -15 --format=%s`)
5. 소유자 정보와 저장소 설명, 이슈 언어 등 보조 신호

한국어 글자(한글)가 우세하면 한국 프로젝트로, 영어가 우세하면 해외 오픈소스로 본다. 신호가 갈리거나 하나도 없으면 한국어를 기본값으로 쓰고, 결과 보고에 어떤 근거로 골랐는지 한 줄 적는다.

판정 결과에 따라 다음 파일을 읽어 그 구조를 그대로 따른다.

| 판정 | 템플릿 |
|------|--------|
| 한국 프로젝트 | `references/pr-template-ko.md` |
| 해외 오픈소스 | `references/pr-template-en.md` |

템플릿은 이 스킬 디렉터리 기준 상대 경로다. 제목 규칙도 각 템플릿 파일에 있으므로 함께 따른다.

### 4. 본문 작성

- 템플릿의 섹션 제목과 순서를 유지한다. 해당 사항이 없는 섹션은 지우지 말고 "해당 없음"(영문은 "N/A")으로 둔다. 리뷰어가 항목이 빠진 건지 비어 있는 건지 구분할 수 있어야 한다.
- 이슈 번호가 브랜치명, 커밋 메시지, 인자에서 확인되면 `Closes #N` 형태로 연결한다. 확인되지 않으면 만들어내지 않는다.
- UI 변경이 있으면 스크린샷 자리를 남기되 가짜 이미지 링크를 넣지 않는다.
- 본문은 임시 파일에 쓰고 `--body-file`로 전달한다. 인라인으로 넘기면 따옴표와 줄바꿈이 깨지기 쉽다. 임시 파일은 시스템이 지정한 scratchpad 디렉터리에 둔다.

### 5. 푸시와 PR 생성

```bash
git push -u origin <현재 브랜치>     # 원격에 없거나 뒤처진 경우만
gh pr create --base <base> --head <브랜치> --title "<제목>" --body-file <파일> [--draft]
```

- 푸시는 현재 브랜치만 한다. 이미 원격과 같으면 생략한다.
- 푸시가 거절되면(non-fast-forward 등) 강제로 밀지 말고 원인을 보고하고 중단한다.
- 시스템이 지정한 PR attribution 줄이 있으면 본문 끝에 붙인다.

### 6. 결과 보고

PR URL, 사용한 템플릿과 그 선택 근거, 제목, 제외하거나 보류한 것(커밋되지 않은 변경, 확인되지 않아 비워 둔 항목)을 짧게 알린다. 부모 대화는 이 보고만 받으므로 URL을 맨 앞에 둔다.
