import csv
import io
import secrets

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import RoleChoices
from apps.escolas.models import Disciplina, Escola, Matricula, Turma, Vinculo

Usuario = get_user_model()


class CSVImportError(Exception):
    pass


class ImportacaoEscolaService:
    """
    Serviço para importar Alunos, Professores, Turmas e Matrículas via CSV.
    """

    @classmethod
    def _obter_escola(cls, escola_id, user):
        if user and user.escola:
            return user.escola
        if escola_id:
            try:
                return Escola.objects.get(id=escola_id)
            except Escola.DoesNotExist as err:
                raise CSVImportError(f"Escola com ID {escola_id} não encontrada.") from err
        raise CSVImportError("Nenhuma escola especificada ou associada ao usuário.")

    @classmethod
    def _dispatch_row(cls, row, escola, criados):
        tipo = row.get("tipo", "").upper()
        handlers = {
            "ALUNO": cls._process_aluno,
            "PROFESSOR": cls._process_professor,
            "TURMA": cls._process_turma,
            "DISCIPLINA": cls._process_disciplina,
            "MATRICULA": cls._process_matricula,
            "VINCULO": cls._process_vinculo,
        }
        if tipo in handlers:
            handlers[tipo](row, escola, criados)
            return

        if not tipo:
            if "aluno_username" in row and "turma" in row:
                cls._process_matricula(row, escola, criados)
            elif "professor_username" in row and "disciplina" in row and "turma" in row:
                cls._process_vinculo(row, escola, criados)
            else:
                msg = (
                    "Coluna 'tipo' não informada ou inválida. "
                    "Esperado: ALUNO, PROFESSOR, TURMA, DISCIPLINA, MATRICULA, VINCULO."
                )
                raise CSVImportError(msg)
        else:
            raise CSVImportError(f"Tipo '{tipo}' desconhecido.")

    @classmethod
    def process_csv(cls, file_obj, escola_id=None, user=None):
        try:
            content = file_obj.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            file_obj.seek(0)
            content = file_obj.read().decode("latin-1")

        csv_reader = csv.DictReader(io.StringIO(content))
        if not csv_reader.fieldnames:
            return {
                "sucesso": False,
                "erros": ["O arquivo CSV está vazio ou sem cabeçalhos válidos."],
                "criados": {},
            }

        try:
            escola = cls._obter_escola(escola_id, user)
        except CSVImportError as e:
            return {"sucesso": False, "erros": [str(e)], "criados": {}}

        linhas = list(csv_reader)
        if not linhas:
            return {
                "sucesso": False,
                "erros": ["Nenhuma linha de dados encontrada no arquivo CSV."],
                "criados": {},
            }

        criados = {
            "alunos": 0,
            "professores": 0,
            "turmas": 0,
            "disciplinas": 0,
            "matriculas": 0,
            "vinculos": 0,
        }
        erros = []

        with transaction.atomic():
            for idx, raw_row in enumerate(linhas, start=2):
                row = {
                    k.strip().lower() if k else "": (v.strip() if v else "")
                    for k, v in raw_row.items()
                }
                try:
                    cls._dispatch_row(row, escola, criados)
                except Exception as e:
                    erros.append(f"Linha {idx}: {str(e)}")

            if erros:
                transaction.set_rollback(True)
                return {"sucesso": False, "erros": erros, "criados": {}}

        return {"sucesso": True, "erros": [], "criados": criados}

    @classmethod
    def _process_aluno(cls, row, escola, criados):
        username = row.get("username")
        email = row.get("email") or ""
        first_name = row.get("nome") or row.get("first_name") or ""
        last_name = row.get("sobrenome") or row.get("last_name") or ""
        turma_nome = row.get("turma")

        if not username:
            raise CSVImportError("Campo 'username' obrigatório para ALUNO.")

        aluno, created = Usuario.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "role": RoleChoices.ALUNO,
                "escola": escola,
            },
        )
        if created:
            password = row.get("password") or secrets.token_urlsafe(10)
            aluno.set_password(password)
            aluno.save()
            criados["alunos"] += 1
        elif aluno.escola != escola:
            raise CSVImportError(f"Aluno '{username}' já pertence a outra escola.")

        if turma_nome:
            turma, _ = Turma.objects.get_or_create(escola=escola, nome=turma_nome)
            _, mat_created = Matricula.objects.get_or_create(aluno=aluno, turma=turma)
            if mat_created:
                criados["matriculas"] += 1

    @classmethod
    def _process_professor(cls, row, escola, criados):
        username = row.get("username")
        email = row.get("email") or ""
        first_name = row.get("nome") or row.get("first_name") or ""
        last_name = row.get("sobrenome") or row.get("last_name") or ""

        if not username:
            raise CSVImportError("Campo 'username' obrigatório para PROFESSOR.")

        prof, created = Usuario.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "role": RoleChoices.PROFESSOR,
                "escola": escola,
            },
        )
        if created:
            password = row.get("password") or secrets.token_urlsafe(10)
            prof.set_password(password)
            prof.save()
            criados["professores"] += 1
        elif prof.escola != escola:
            raise CSVImportError(f"Professor '{username}' já pertence a outra escola.")

    @classmethod
    def _process_turma(cls, row, escola, criados):
        nome = row.get("nome") or row.get("turma")
        ano = row.get("ano_letivo") or 2026
        if not nome:
            raise CSVImportError("Campo 'nome' ou 'turma' obrigatório para TURMA.")

        _, created = Turma.objects.get_or_create(
            escola=escola,
            nome=nome,
            ano_letivo=int(ano),
        )
        if created:
            criados["turmas"] += 1

    @classmethod
    def _process_disciplina(cls, row, escola, criados):
        nome = row.get("nome") or row.get("disciplina")
        codigo = row.get("codigo") or ""
        if not nome:
            raise CSVImportError("Campo 'nome' ou 'disciplina' obrigatório para DISCIPLINA.")

        _, created = Disciplina.objects.get_or_create(
            escola=escola,
            nome=nome,
            defaults={"codigo": codigo},
        )
        if created:
            criados["disciplinas"] += 1

    @classmethod
    def _process_matricula(cls, row, escola, criados):
        username = row.get("aluno_username") or row.get("username")
        turma_nome = row.get("turma")
        if not username or not turma_nome:
            raise CSVImportError("Campos 'aluno_username' e 'turma' são obrigatórios.")

        try:
            aluno = Usuario.objects.get(
                username=username,
                escola=escola,
                role=RoleChoices.ALUNO,
            )
        except Usuario.DoesNotExist as err:
            raise CSVImportError(f"Aluno '{username}' não encontrado na escola.") from err

        turma, turma_created = Turma.objects.get_or_create(escola=escola, nome=turma_nome)
        if turma_created:
            criados["turmas"] += 1

        _, created = Matricula.objects.get_or_create(aluno=aluno, turma=turma)
        if created:
            criados["matriculas"] += 1

    @classmethod
    def _process_vinculo(cls, row, escola, criados):
        prof_username = row.get("professor_username") or row.get("username")
        turma_nome = row.get("turma")
        disc_nome = row.get("disciplina")

        if not prof_username or not turma_nome or not disc_nome:
            msg = (
                "Campos 'professor_username', 'turma' e 'disciplina' são obrigatórios para VINCULO."
            )
            raise CSVImportError(msg)

        try:
            professor = Usuario.objects.get(
                username=prof_username,
                escola=escola,
                role=RoleChoices.PROFESSOR,
            )
        except Usuario.DoesNotExist as err:
            raise CSVImportError(f"Professor '{prof_username}' não encontrado na escola.") from err

        turma, turma_created = Turma.objects.get_or_create(escola=escola, nome=turma_nome)
        if turma_created:
            criados["turmas"] += 1

        disciplina, disc_created = Disciplina.objects.get_or_create(escola=escola, nome=disc_nome)
        if disc_created:
            criados["disciplinas"] += 1

        _, created = Vinculo.objects.get_or_create(
            professor=professor,
            turma=turma,
            disciplina=disciplina,
        )
        if created:
            criados["vinculos"] += 1


class ImportacaoCSVSerializer(serializers.Serializer):
    arquivo = serializers.FileField(required=True)
    escola_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_arquivo(self, value):
        if not value.name.endswith(".csv"):
            raise serializers.ValidationError("O arquivo enviado deve ser do tipo .csv")
        return value
