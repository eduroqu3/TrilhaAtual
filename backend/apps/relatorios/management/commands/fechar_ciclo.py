from django.core.management.base import BaseCommand, CommandError

from apps.avaliacoes.models import CicloAvaliacao
from apps.relatorios.services import FechamentoCicloService


class Command(BaseCommand):
    help = (
        "Fecha um ciclo de avaliação e processa os resumos pedagógicos respeitando o limiar mínimo."
    )

    def add_arguments(self, parser):
        parser.add_argument("ciclo_id", type=int, help="ID do ciclo a ser fechado")

    def handle(self, *args, **options):
        ciclo_id = options["ciclo_id"]
        try:
            ciclo = CicloAvaliacao.objects.get(id=ciclo_id)
        except CicloAvaliacao.DoesNotExist as err:
            raise CommandError(f"Ciclo com ID {ciclo_id} não encontrado.") from err

        resumos = FechamentoCicloService.fechar_e_gerar_resumos(ciclo)
        total_limiar = sum(1 for r in resumos if r.limiar_atingido)

        self.stdout.write(
            self.style.SUCCESS(
                f"Ciclo '{ciclo.nome}' fechado com sucesso! "
                f"Resumos gerados: {len(resumos)} ({total_limiar} atingiram o limiar mínimo)."
            )
        )
